import jwt from 'jsonwebtoken';

const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET ||
  '';
const jwtSecret = process.env.JWT_SECRET || '';
const outputShell = process.argv.includes('--shell');

function fail(message) {
  console.error(`[fixture] ${message}`);
  process.exit(1);
}

function requireEnv(name, value) {
  if (!value) {
    fail(`Missing env: ${name}`);
  }
}

function randomSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function ensureBackendHealth() {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) {
    fail(`Backend health failed: HTTP ${response.status}`);
  }
}

async function createSupabaseUser(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    fail(`Unable to create user ${email}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function apiRequest(token, method, path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function requestOrFail(token, method, path, body) {
  const response = await apiRequest(token, method, path, body);
  if (!response.ok) {
    fail(`${method} ${path} failed (${response.status}): ${JSON.stringify(response.payload)}`);
  }
  return response.payload;
}

function buildJwt(userId, email) {
  return jwt.sign(
    { id: userId, email },
    jwtSecret,
    { expiresIn: '4h' }
  );
}

function printShellExports(fixture) {
  const lines = [
    `export PARITY_DEV_TOKEN='${fixture.tokenA}'`,
    `export PARITY_CARD_ID='${fixture.cardId}'`,
    `export PARITY_TASK_ID='${fixture.taskId}'`,
    `export PARITY_TASK_TITLE='${fixture.taskTitle}'`,
    `export PARITY_WEBHOOK_URL='${fixture.webhookUrl}'`,
    `export PARITY_EVIDENCE_DIR='docs/qa/evidence/epic-6'`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main() {
  requireEnv('SUPABASE_URL', supabaseUrl);
  requireEnv('SUPABASE_SERVICE_ROLE_KEY', supabaseServiceKey);
  requireEnv('JWT_SECRET', jwtSecret);

  await ensureBackendHealth();

  const suffix = randomSuffix();
  const password = 'StrongPass123!';
  const emailA = `parity-a-${suffix}@example.com`;
  const emailB = `parity-b-${suffix}@example.com`;

  const [userA, userB] = await Promise.all([
    createSupabaseUser(emailA, password),
    createSupabaseUser(emailB, password),
  ]);

  const tokenA = buildJwt(userA.id, emailA);
  const tokenB = buildJwt(userB.id, emailB);

  const flow = await requestOrFail(tokenA, 'POST', '/api/flows', {
    name: `UAT Parity ${suffix}`,
  });

  const flowDetails = await requestOrFail(tokenA, 'GET', `/api/flows/${flow.id}`);
  const firstColumn = Array.isArray(flowDetails.columns) ? flowDetails.columns[0] : null;
  if (!firstColumn?.id) {
    fail(`Flow ${flow.id} does not have columns`);
  }

  const card = await requestOrFail(tokenA, 'POST', '/api/cards', {
    title: `Card Parity ${suffix}`,
    description: 'Card de fixture para UAT Epic 6',
    columnId: firstColumn.id,
  });

  const task = await requestOrFail(tokenA, 'POST', '/api/tasks', {
    title: `Task Parity ${suffix}`,
    description: 'Task de fixture para validar Task Modal 2.0',
    priority: 'P1',
    status: 'open',
    assignedTo: 'QA User',
    cardId: card.id,
  });

  const tag = await requestOrFail(tokenA, 'POST', '/api/tags', {
    name: `PARITY-${suffix}`,
    color: '#2563eb',
  });

  await requestOrFail(tokenA, 'POST', `/api/tags/tasks/${task.id}/tags/${tag.id}`);
  await requestOrFail(tokenA, 'POST', `/api/tags/cards/${card.id}/tags/${tag.id}`);

  const webhookUrl = `https://example.com/webhook-parity-${suffix}`;
  await requestOrFail(tokenA, 'POST', '/api/webhooks', {
    url: webhookUrl,
    description: 'Webhook de fixture parity',
    enabled: true,
  });

  const deniedGet = await apiRequest(tokenB, 'GET', `/api/tags/tasks/${task.id}/tags`);
  const deniedAdd = await apiRequest(
    tokenB,
    'POST',
    `/api/tags/tasks/${task.id}/tags/${tag.id}`
  );
  const deniedCardGet = await apiRequest(tokenB, 'GET', `/api/cards/${card.id}`);
  const deniedCardUpdate = await apiRequest(tokenB, 'PUT', `/api/cards/${card.id}`, {
    title: 'Tentativa indevida de update',
  });

  const acceptedStatuses = new Set([403, 404]);
  if (!acceptedStatuses.has(deniedGet.status)) {
    fail(`Negative permission GET failed (expected 403/404, got ${deniedGet.status})`);
  }

  if (!acceptedStatuses.has(deniedAdd.status)) {
    fail(`Negative permission POST failed (expected 403/404, got ${deniedAdd.status})`);
  }

  if (!acceptedStatuses.has(deniedCardGet.status)) {
    fail(`Negative permission card GET failed (expected 403/404, got ${deniedCardGet.status})`);
  }

  if (!acceptedStatuses.has(deniedCardUpdate.status)) {
    fail(`Negative permission card PUT failed (expected 403/404, got ${deniedCardUpdate.status})`);
  }

  const fixture = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    flowId: flow.id,
    columnId: firstColumn.id,
    cardId: card.id,
    taskId: task.id,
    taskTitle: task.title,
    tagId: tag.id,
    webhookUrl,
    tokenA,
    tokenB,
    permissionChecks: {
      getTaskTagsAsOtherUser: deniedGet.status,
      addTaskTagAsOtherUser: deniedAdd.status,
      getCardAsOtherUser: deniedCardGet.status,
      updateCardAsOtherUser: deniedCardUpdate.status,
    },
  };

  if (outputShell) {
    printShellExports(fixture);
    return;
  }

  process.stdout.write(`${JSON.stringify(fixture, null, 2)}\n`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
