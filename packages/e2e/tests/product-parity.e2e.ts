import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const parityDevToken = process.env.PARITY_DEV_TOKEN || '';
const parityFlowId = Number(process.env.PARITY_FLOW_ID || '0');
const parityColumnId = Number(process.env.PARITY_COLUMN_ID || '0');
const parityTargetColumnId = Number(process.env.PARITY_TARGET_COLUMN_ID || '0');
const parityCardId = Number(process.env.PARITY_CARD_ID || '0');
const parityCardTitle = process.env.PARITY_CARD_TITLE || '';
const parityTaskId = Number(process.env.PARITY_TASK_ID || '0');
const parityTaskTitle = process.env.PARITY_TASK_TITLE || '';
const parityWebhookUrl = process.env.PARITY_WEBHOOK_URL || '';
const parityApiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const evidenceDir = process.env.PARITY_EVIDENCE_DIR || 'docs/qa/evidence/epic-6';

mkdirSync(evidenceDir, { recursive: true });

function buildSmokeToken(): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' })
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id: 'parity-smoke-user',
      email: 'parity-smoke@example.com',
      name: 'Parity Smoke',
    })
  ).toString('base64url');

  return `${header}.${payload}.`;
}

const sessionToken = parityDevToken || buildSmokeToken();

function hasAuthenticatedFixture(): boolean {
  return Boolean(parityDevToken && parityCardId > 0 && parityTaskId > 0);
}

function hasFlowsFixture(): boolean {
  return Boolean(parityFlowId > 0 && parityColumnId > 0 && parityTargetColumnId > 0 && parityCardTitle);
}

function withToken(pathname: string): string {
  const token = encodeURIComponent(sessionToken);
  return `${pathname}${pathname.includes('?') ? '&' : '?'}devToken=${token}`;
}

function parseJwtPayload(token: string): { id?: string; email?: string } {
  if (!token) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

async function captureEvidence(page: Page, filename: string) {
  await page.screenshot({
    path: join(evidenceDir, filename),
    fullPage: true,
  });
}

async function prepareAuthenticatedPage(page: Page) {
  const payload = parseJwtPayload(sessionToken);

  await page.addInitScript((token) => {
    window.localStorage.setItem('synkra_dev_token', token);
    window.localStorage.setItem('token', token);
  }, sessionToken);

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: payload.id || 'parity-test-user',
        email: payload.email || 'parity@example.com',
        name: 'Parity QA',
      }),
    });
  });
}

async function expectCardWorkspaceLoaded(page: Page) {
  await expect(
    page.getByRole('heading', { level: 2, name: 'Card Workspace' })
  ).toBeVisible();
  await expect(page.getByTestId('card-workspace')).toBeVisible();
  await expect(page.getByTestId('card-primary-details')).toBeVisible();
}

async function getCurrentCardTitle(request: Page['request']): Promise<string> {
  const fallbackTitle = parityCardTitle || `Card #${parityCardId}`;
  const response = await request.get(`${parityApiBaseUrl}/api/cards/${parityCardId}`, {
    headers: {
      Authorization: `Bearer ${parityDevToken}`,
    },
  });

  if (!response.ok()) {
    return fallbackTitle;
  }

  const payload = await response.json();
  return payload?.title || fallbackTitle;
}

test.describe('Product Parity E2E', () => {
  test('jornada auth responde 200', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Entrar' })
    ).toBeVisible();

    await page.goto('/auth/signup');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Criar Conta' })
    ).toBeVisible();
  });

  test('jornada painel + fluxos responde 200', async ({ page }) => {
    test.slow();
    await prepareAuthenticatedPage(page);
    await page.goto(withToken('/'));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Painel Consolidado de Operações' })
    ).toBeVisible();

    await page.goto(withToken('/dashboard/automations'));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Fluxos 2.0' })
    ).toBeVisible({ timeout: 20_000 });

    await captureEvidence(page, '01-painel-fluxos.png');
  });

  test('jornada card workspace responde 200', async ({ page }) => {
    test.skip(!hasAuthenticatedFixture(), 'Set PARITY_DEV_TOKEN, PARITY_CARD_ID and PARITY_TASK_ID');
    await prepareAuthenticatedPage(page);
    await page.goto(withToken(`/cards/${parityCardId}`));
    await expectCardWorkspaceLoaded(page);

    await captureEvidence(page, '02-card-workspace-basico.png');
  });

  test('jornada webhooks local responde 200', async ({ page }) => {
    test.skip(!hasAuthenticatedFixture(), 'Set PARITY_DEV_TOKEN, PARITY_CARD_ID and PARITY_TASK_ID');
    await prepareAuthenticatedPage(page);
    await page.goto(withToken('/dashboard/webhooks/local'));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Webhooks - Fluxo Crítico Local' })
    ).toBeVisible();

    await captureEvidence(page, '03-webhooks-basico.png');
  });
});

test.describe('Product Parity E2E (authenticated)', () => {
  test.skip(!hasAuthenticatedFixture(), 'Set PARITY_DEV_TOKEN, PARITY_CARD_ID and PARITY_TASK_ID');

  test.beforeEach(async ({ page }) => {
    await prepareAuthenticatedPage(page);
  });

  test('card workspace mostra contexto de equipe e timeline', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}`));

    await expectCardWorkspaceLoaded(page);
    await expect(page.getByText('Líder:', { exact: false })).toBeVisible();
    await expect(page.getByTestId('card-timeline-panel')).toBeVisible();

    await captureEvidence(page, '04-card-workspace-autenticado.png');
  });

  test('card workspace permite salvar card e registrar nota na timeline', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}`));

    const editedTitle = `Card QA ${Date.now()}`;
    const noteText = `qa-note-${Date.now()}`;

    const cardArticle = page.getByTestId('card-primary-details');
    await cardArticle.locator('input').first().fill(editedTitle);
    await page.getByRole('button', { name: 'Salvar card' }).click();

    await expect(cardArticle.locator('input').first()).toHaveValue(editedTitle);

    await page.getByPlaceholder('Escreva uma atualização relevante para o time.').fill(noteText);
    await page.getByRole('button', { name: 'Publicar nota' }).click();
    await expect(page.getByText(noteText)).toBeVisible();

    await captureEvidence(page, '04b-card-save-timeline.png');
  });

  test('task modal abre por entrada de painel (query taskId)', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}?taskId=${parityTaskId}`));

    await expect(
      page.getByTestId('task-modal').getByRole('heading', { level: 2, name: 'Editar tarefa' })
    ).toBeVisible();
    await expect(
      page.getByTestId('task-modal').getByRole('heading', { level: 3, name: 'Timeline da tarefa' })
    ).toBeVisible();

    const modalSection = page.getByTestId('task-modal');
    await modalSection.locator('select').nth(1).selectOption('in_progress');
    const saveTaskButton = modalSection.getByRole('button', { name: 'Salvar alterações' });
    await saveTaskButton.scrollIntoViewIfNeeded();
    await saveTaskButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    await page.goto(withToken(`/cards/${parityCardId}?taskId=${parityTaskId}`));
    await expect(page.getByText('Task updated').first()).toBeVisible();

    await captureEvidence(page, '05-task-modal-via-painel.png');
  });

  test('task modal abre por entrada de fluxo (query newTask)', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}?newTask=1`));

    await expect(
      page.getByRole('heading', { level: 2, name: 'Nova tarefa' })
    ).toBeVisible();

    await captureEvidence(page, '06-task-modal-via-fluxo.png');
  });

  test('task modal abre por clique na lista de tarefas do card', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}`));

    const taskButton = parityTaskTitle
      ? page.getByRole('button', { name: parityTaskTitle })
      : page.getByTestId('card-tasks-panel').getByRole('button').nth(1);

    await taskButton.click();

    await expect(
      page.getByTestId('task-modal').getByRole('heading', { level: 2, name: 'Editar tarefa' })
    ).toBeVisible();

    await captureEvidence(page, '07-task-modal-via-card.png');
  });

  test('fluxos mantém filtro ao alternar Quadro/Tabela/Indicadores', async ({ page, request }) => {
    test.skip(!hasFlowsFixture(), 'Set PARITY_FLOW_ID, PARITY_COLUMN_ID, PARITY_TARGET_COLUMN_ID and PARITY_CARD_TITLE');

    const currentCardTitle = await getCurrentCardTitle(request);
    await page.goto(withToken(`/flows/${parityFlowId}`));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Fluxos 2.0' })
    ).toBeVisible();

    const filterInput = page.getByPlaceholder('Filtrar por card, descrição, responsável ou tag...');
    const filterValue = currentCardTitle.split(' ')[0] || 'Card';

    await filterInput.fill(filterValue);
    await expect(filterInput).toHaveValue(filterValue);

    await page.getByRole('button', { name: 'Tabela' }).click();
    await expect(filterInput).toHaveValue(filterValue);
    await expect(page.locator('table')).toBeVisible();

    await page.getByRole('button', { name: 'Indicadores' }).click();
    await expect(filterInput).toHaveValue(filterValue);
    await expect(page.getByText('Throughput (7 dias)')).toBeVisible();

    await page.getByRole('button', { name: 'Quadro' }).click();
    await expect(filterInput).toHaveValue(filterValue);
    await expect(page.getByText(currentCardTitle)).toBeVisible();

    await captureEvidence(page, '04a-flows-tab-filter-persistence.png');
  });

  test('fluxos permite mover card e persistir após refresh', async ({ page, request }) => {
    test.skip(!hasFlowsFixture(), 'Set PARITY_FLOW_ID, PARITY_COLUMN_ID, PARITY_TARGET_COLUMN_ID and PARITY_CARD_TITLE');

    await page.setViewportSize({ width: 1800, height: 1200 });
    const currentCardTitle = await getCurrentCardTitle(request);
    const resetMove = await request.patch(`${parityApiBaseUrl}/api/cards/${parityCardId}/move`, {
      headers: {
        Authorization: `Bearer ${parityDevToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        toColumnId: parityColumnId,
      },
    });
    expect([200, 409]).toContain(resetMove.status());

    await page.goto(withToken(`/flows/${parityFlowId}`));
    await page.getByRole('button', { name: 'Quadro' }).click();
    await expect(page.getByText(currentCardTitle)).toBeVisible();

    const columns = page.getByTestId('kanban-column');
    const sourceColumn = columns.nth(0);
    const targetColumn = columns.nth(1);
    const movingCard = page.getByTestId('kanban-card').filter({ hasText: currentCardTitle }).first();
    await expect(movingCard).toBeVisible();
    await targetColumn.scrollIntoViewIfNeeded();
    await movingCard.dragTo(targetColumn, { force: true });
    await expect(targetColumn.getByText(currentCardTitle)).toBeVisible();

    await page.reload();
    const reloadedColumns = page.getByTestId('kanban-column');
    await expect(
      reloadedColumns.nth(1).getByText(currentCardTitle)
    ).toBeVisible();

    await captureEvidence(page, '04c-flows-dnd-persistence.png');
  });

  test('fluxos abre card por clique no quadro e na tabela', async ({ page, request }) => {
    test.slow();
    test.skip(!hasFlowsFixture(), 'Set PARITY_FLOW_ID, PARITY_COLUMN_ID, PARITY_TARGET_COLUMN_ID and PARITY_CARD_TITLE');

    const currentCardTitle = await getCurrentCardTitle(request);
    await page.goto(withToken(`/flows/${parityFlowId}`));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Fluxos 2.0' })
    ).toBeVisible();

    const filterInput = page.getByPlaceholder('Filtrar por card, descrição, responsável ou tag...');
    await filterInput.fill(currentCardTitle);

    // Board click -> card workspace
    await page.getByRole('button', { name: 'Quadro' }).click();
    await page.getByText(currentCardTitle).first().click();
    await expectCardWorkspaceLoaded(page);

    // Table click -> card workspace
    await page.goto(withToken(`/flows/${parityFlowId}`));
    await page.getByPlaceholder('Filtrar por card, descrição, responsável ou tag...').fill(currentCardTitle);
    await page.getByRole('button', { name: 'Tabela' }).click();
    await page.getByRole('button', { name: currentCardTitle }).first().click();
    await expectCardWorkspaceLoaded(page);

    await captureEvidence(page, '11-flows-open-card-board-table.png');
  });

  test('calendário reflete due date da tarefa no painel', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}?taskId=${parityTaskId}`));

    await expect(
      page.getByRole('heading', { level: 2, name: 'Editar tarefa' })
    ).toBeVisible();

    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const localDueDate = dueDate.toISOString().slice(0, 10);
    await page.getByTestId('task-modal').locator('input[type="date"]').first().fill(localDueDate);

    const saveTaskButton = page
      .getByTestId('task-modal')
      .getByRole('button', { name: 'Salvar alterações' });
    await saveTaskButton.scrollIntoViewIfNeeded();
    await saveTaskButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    await page.goto(withToken('/'));
    const dueEventRow = page
      .getByTestId('calendar-panel')
      .locator('li')
      .filter({ hasText: `Tarefa #${parityTaskId}` })
      .first();
    await expect(dueEventRow).toBeVisible();
    if (parityTaskTitle.trim()) {
      await expect(dueEventRow).toContainText(`Prazo: ${parityTaskTitle}`);
    }

    await captureEvidence(page, '09b-calendar-due-date-reflection.png');
  });

  test('calendário valida filtros rápidos (Próximos 7 dias, Sem data, Todos)', async ({ page }) => {
    await page.goto(withToken('/'));
    await expect(page.getByTestId('calendar-panel')).toBeVisible();

    const upcomingFilter = page.getByRole('button', { name: 'Próximos 7 dias' });
    const undatedFilter = page.getByRole('button', { name: 'Sem data' });
    const allFilter = page.getByRole('button', { name: 'Todos' });

    await undatedFilter.click();
    await expect(page.getByText(/tarefas sem prazo/i)).toBeVisible();

    await upcomingFilter.click();
    await expect(page.getByText(/tarefas sem prazo/i)).toHaveCount(0);

    await allFilter.click();
    await expect(page.getByRole('heading', { level: 3, name: 'Próximos eventos' })).toBeVisible();

    await captureEvidence(page, '10-calendar-quick-filters.png');
  });

  test('calendario permite criar, editar e remover evento com persistência UTC/local', async ({ page, request }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto(withToken('/'));

    const eventTitle = `Evento QA ${Date.now()}`;
    const updatedEventTitle = `${eventTitle} atualizado`;
    const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

    await page.getByRole('button', { name: 'Novo evento' }).click();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Novo evento' })
    ).toBeVisible();

    const eventDialog = page.getByRole('dialog');
    await eventDialog.locator('input[type="text"]').first().fill(eventTitle);
    await eventDialog.locator('input[type="datetime-local"]').first().fill(startsAt);
    const createButton = eventDialog.getByRole('button', { name: 'Criar evento' });
    await createButton.scrollIntoViewIfNeeded();
    await createButton.click();

    await expect(page.getByText(eventTitle)).toBeVisible();

    const eventsResponse = await request.get(
      `${parityApiBaseUrl}/api/events?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${parityDevToken}`,
        },
      }
    );
    expect(eventsResponse.ok()).toBeTruthy();
    const eventsPayload = await eventsResponse.json();
    const createdEvent = (eventsPayload.items || []).find(
      (item: { title?: string; starts_at?: string }) => item.title === eventTitle
    );
    expect(createdEvent).toBeTruthy();
    const normalizedUtcIso = new Date(createdEvent.starts_at).toISOString();
    expect(normalizedUtcIso.endsWith('Z')).toBeTruthy();

    const utcStored = new Date(normalizedUtcIso);
    const offsetMs = utcStored.getTimezoneOffset() * 60 * 1000;
    const backToLocalInput = new Date(utcStored.getTime() - offsetMs)
      .toISOString()
      .slice(0, 16);
    expect(backToLocalInput).toBe(startsAt);

    const createdEventRow = page.locator('li').filter({ hasText: eventTitle }).first();
    await createdEventRow.getByRole('button', { name: 'Editar' }).click();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Editar evento' })
    ).toBeVisible();

    await eventDialog.locator('input[type="text"]').first().fill(updatedEventTitle);
    const saveButton = eventDialog.getByRole('button', { name: 'Salvar evento' });
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click();

    await expect(page.getByText(updatedEventTitle)).toBeVisible();

    const updatedEventRow = page.locator('li').filter({ hasText: updatedEventTitle }).first();
    await updatedEventRow.getByRole('button', { name: 'Editar' }).click();
    const deleteButton = eventDialog.getByRole('button', { name: 'Remover evento' });
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.click();
    await expect(page.getByText(updatedEventTitle)).toHaveCount(0);

    await captureEvidence(page, '09-calendar-event-lifecycle.png');
  });

  test('task modal permite criar, editar, excluir tarefa e validar histórico', async ({ page }) => {
    test.slow();
    await page.goto(withToken(`/cards/${parityCardId}?newTask=1`));

    await expect(
      page.getByRole('heading', { level: 2, name: 'Nova tarefa' })
    ).toBeVisible();

    const newTaskTitle = `Task CRUD ${Date.now()}`;
    const taskModal = page.getByTestId('task-modal');
    await taskModal.locator('input[type="text"]').first().fill(newTaskTitle);
    await taskModal.locator('textarea').first().fill('Tarefa criada no cenário de parity.');
    await taskModal.locator('select').nth(0).selectOption('P1');
    await taskModal.locator('select').nth(1).selectOption('open');
    await taskModal.locator('input[type="text"]').nth(1).fill('QA User');

    const createTaskButton = taskModal.getByRole('button', { name: 'Criar tarefa' });
    await createTaskButton.scrollIntoViewIfNeeded();
    await createTaskButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    const createdTaskButton = page.getByRole('button', { name: newTaskTitle }).first();
    await expect(createdTaskButton).toBeVisible();
    await createdTaskButton.click();

    await expect(
      page.getByRole('heading', { level: 2, name: 'Editar tarefa' })
    ).toBeVisible();

    const updatedTaskTitle = `${newTaskTitle} editada`;
    await taskModal.locator('input[type="text"]').first().fill(updatedTaskTitle);
    await taskModal.locator('select').nth(1).selectOption('completed');
    const saveTaskButton = taskModal.getByRole('button', { name: 'Salvar alterações' });
    await saveTaskButton.scrollIntoViewIfNeeded();
    await saveTaskButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    const updatedTaskButton = page.getByRole('button', { name: updatedTaskTitle }).first();
    await expect(updatedTaskButton).toBeVisible();
    await updatedTaskButton.click();
    await expect(page.getByText('Task created').first()).toBeVisible();
    await expect(page.getByText('Task updated').first()).toBeVisible({ timeout: 15_000 });

    const deleteTaskButton = taskModal.getByRole('button', { name: 'Remover tarefa' });
    await deleteTaskButton.scrollIntoViewIfNeeded();
    await deleteTaskButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    await expect(page.getByRole('button', { name: updatedTaskTitle })).toHaveCount(0);
    await captureEvidence(page, '12-task-crud-history.png');
  });

  test('webhooks local lista webhook real com token aplicado', async ({ page }) => {
    await page.goto(withToken('/dashboard/webhooks/local'));

    await page.getByPlaceholder('Cole aqui o token JWT de teste').fill(parityDevToken);
    await page.getByRole('button', { name: 'Aplicar token' }).click();

    await expect(page.getByText('✓ OK')).toBeVisible();

    if (parityWebhookUrl) {
      await expect(page.getByText(parityWebhookUrl)).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText('Sem token de teste. Exibindo fallback local.', { exact: false })
      ).toHaveCount(0);
    }

    await captureEvidence(page, '08-webhooks-autenticado.png');
  });
});
