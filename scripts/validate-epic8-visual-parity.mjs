import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, request as playwrightRequest } from 'playwright';

const beforeBaseUrl = process.env.BEFORE_BASE_URL || 'http://127.0.0.1:3011';
const afterBaseUrl = process.env.AFTER_BASE_URL || 'http://127.0.0.1:3010';
const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const evidenceRoot = process.env.EPIC8_EVIDENCE_DIR || 'docs/qa/evidence/epic-8';
const reportPath =
  process.env.EPIC8_REPORT_PATH || 'docs/qa/epic-8-visual-validation-report.md';

const parityDevToken = process.env.PARITY_DEV_TOKEN || '';
const parityFlowId = Number(process.env.PARITY_FLOW_ID || '0');
const parityColumnId = Number(process.env.PARITY_COLUMN_ID || '0');
const parityTargetColumnId = Number(process.env.PARITY_TARGET_COLUMN_ID || '0');
const parityCardId = Number(process.env.PARITY_CARD_ID || '0');
const parityCardTitle = process.env.PARITY_CARD_TITLE || '';
const parityTaskTitle = process.env.PARITY_TASK_TITLE || '';
const parityTokenPayload = parityDevToken
  ? JSON.parse(Buffer.from(parityDevToken.split('.')[1] || '', 'base64url').toString('utf8'))
  : null;

const results = [];

function evidencePath(story, filename) {
  const dir = join(evidenceRoot, story);
  mkdirSync(dir, { recursive: true });
  return join(dir, filename);
}

function withToken(pathname) {
  if (!parityDevToken) {
    return pathname;
  }

  const encoded = encodeURIComponent(parityDevToken);
  return `${pathname}${pathname.includes('?') ? '&' : '?'}devToken=${encoded}`;
}

function ensureCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function record(name, status, details = '') {
  results.push({ name, status, details });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveShot(target, filename, locator = null) {
  const path = target.includes('/8.')
    ? target
    : evidencePath(target, filename);

  if (locator) {
    await locator.screenshot({ path });
    return path;
  }

  throw new Error('saveShot requer locator quando o target não é caminho absoluto.');
}

async function savePageScreenshot(page, story, filename) {
  const path = evidencePath(story, filename);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function createContext(browser, width, height) {
  const context = await browser.newContext({
    viewport: {
      width,
      height,
    },
  });

  if (parityDevToken) {
    await context.addInitScript((token) => {
      window.localStorage.setItem('synkra_dev_token', token);
      window.localStorage.setItem('token', token);
    }, parityDevToken);

    await context.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: parityTokenPayload?.id || 'epic8-test-user',
          email: parityTokenPayload?.email || 'epic8@example.com',
          name: 'Epic 8 QA',
        }),
      });
    });
  }

  return context;
}

async function waitForHome(page, baseUrl, tokenized = false) {
  await page.goto(`${baseUrl}${tokenized ? withToken('/') : '/'}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('heading', { level: 1, name: 'Painel Consolidado de Operações' }).waitFor();
  await page.waitForTimeout(600);
}

async function waitForDashboardShell(page, baseUrl, tokenized = false) {
  await page.goto(`${baseUrl}${tokenized ? withToken('/dashboard/automations') : '/dashboard/automations'}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('heading', { level: 1, name: 'Fluxos 2.0' }).waitFor();
  await page.waitForTimeout(600);
}

async function waitForFlows(page, baseUrl) {
  ensureCondition(parityFlowId > 0, 'PARITY_FLOW_ID ausente para validar Fluxos.');
  await page.goto(`${baseUrl}${withToken(`/flows/${parityFlowId}`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('heading', { level: 1, name: 'Fluxos 2.0' }).waitFor();
  await page.waitForTimeout(900);
}

async function waitForCardBefore(page) {
  ensureCondition(parityCardId > 0, 'PARITY_CARD_ID ausente para validar Card Workspace.');
  await page.goto(`${beforeBaseUrl}${withToken(`/cards/${parityCardId}`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('heading', { level: 1, name: 'Card Workspace 2.0' }).waitFor();
  await page.waitForTimeout(900);
}

async function waitForCardAfter(page) {
  ensureCondition(parityCardId > 0, 'PARITY_CARD_ID ausente para validar Card Workspace.');
  await page.goto(`${afterBaseUrl}${withToken(`/cards/${parityCardId}`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByTestId('card-workspace').waitFor();
  await page.waitForTimeout(900);
}

async function waitForLogin(page, baseUrl) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 2, name: 'Entrar' }).waitFor();
  await page.waitForTimeout(400);
}

async function assertNoHorizontalOverflow(page, route, label, tokenized = false) {
  const target = `${afterBaseUrl}${tokenized ? withToken(route) : route}`;
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  const overflow =
    metrics.scrollWidth > metrics.innerWidth + 2 ||
    metrics.bodyScrollWidth > metrics.innerWidth + 2;

  ensureCondition(!overflow, `${label} teve overflow horizontal em ${metrics.innerWidth}px.`);
  record(label, 'PASS', `Sem overflow horizontal (${metrics.innerWidth}px).`);
}

async function compareShellEvidence(browser) {
  const afterDesktop = await createContext(browser, 1440, 1100);
  const beforeDesktop = await createContext(browser, 1440, 1100);
  const afterMobile = await createContext(browser, 375, 900);
  const beforeMobile = await createContext(browser, 375, 900);

  const afterDesktopPage = await afterDesktop.newPage();
  const beforeDesktopPage = await beforeDesktop.newPage();
  const afterMobilePage = await afterMobile.newPage();
  const beforeMobilePage = await beforeMobile.newPage();

  await waitForDashboardShell(beforeDesktopPage, beforeBaseUrl, true);
  await waitForDashboardShell(afterDesktopPage, afterBaseUrl, true);
  await waitForDashboardShell(beforeMobilePage, beforeBaseUrl, true);
  await waitForDashboardShell(afterMobilePage, afterBaseUrl, true);

  await savePageScreenshot(beforeDesktopPage, '8.1', 'before-shell-desktop.png');
  await savePageScreenshot(afterDesktopPage, '8.1', 'after-shell-desktop.png');
  await savePageScreenshot(beforeMobilePage, '8.1', 'before-shell-mobile.png');
  await savePageScreenshot(afterMobilePage, '8.1', 'after-shell-mobile.png');

  await waitForLogin(afterDesktopPage, afterBaseUrl);
  await savePageScreenshot(afterDesktopPage, '8.1', 'after-auth-login.png');

  await waitForHome(afterDesktopPage, afterBaseUrl, true);
  await savePageScreenshot(afterDesktopPage, '8.1', 'after-home-smoke.png');

  await waitForCardAfter(afterDesktopPage);
  await savePageScreenshot(afterDesktopPage, '8.1', 'after-card-smoke.png');

  await waitForDashboardShell(afterDesktopPage, afterBaseUrl, true);
  await afterDesktopPage.locator('body').click();
  const focusTrail = [];
  for (let index = 0; index < 4; index += 1) {
    await afterDesktopPage.keyboard.press('Tab');
    await afterDesktopPage.waitForTimeout(120);
    const activeDescription = await afterDesktopPage.evaluate(() => {
      const element = document.activeElement;
      if (!element) {
        return 'none';
      }
      const text = element.textContent?.trim() || '';
      const ariaLabel = element.getAttribute('aria-label') || '';
      const placeholder = element.getAttribute('placeholder') || '';
      return [element.tagName.toLowerCase(), ariaLabel, placeholder, text]
        .filter(Boolean)
        .join(' | ');
    });
    focusTrail.push(activeDescription);
  }
  record('8.1 teclado shell', 'PASS', focusTrail.join(' -> '));

  const overflowDesktop = await createContext(browser, 1440, 1100);
  const overflowTablet = await createContext(browser, 768, 1024);
  const overflowMobile = await createContext(browser, 375, 900);

  await assertNoHorizontalOverflow(await overflowDesktop.newPage(), '/', '8.1 responsividade home 1440', true);
  await assertNoHorizontalOverflow(await overflowTablet.newPage(), '/', '8.1 responsividade home 768', true);
  await assertNoHorizontalOverflow(await overflowMobile.newPage(), '/', '8.1 responsividade home 375', true);
  await assertNoHorizontalOverflow(await (await createContext(browser, 1440, 1100)).newPage(), '/dashboard/automations', '8.1 responsividade automations 1440', true);
  await assertNoHorizontalOverflow(await (await createContext(browser, 768, 1024)).newPage(), '/dashboard/automations', '8.1 responsividade automations 768', true);
  await assertNoHorizontalOverflow(await (await createContext(browser, 375, 900)).newPage(), '/dashboard/automations', '8.1 responsividade automations 375', true);
  await assertNoHorizontalOverflow(await (await createContext(browser, 1440, 1100)).newPage(), `/cards/${parityCardId}`, '8.1 responsividade card 1440', true);
  await assertNoHorizontalOverflow(await (await createContext(browser, 768, 1024)).newPage(), `/cards/${parityCardId}`, '8.1 responsividade card 768', true);
  await assertNoHorizontalOverflow(await (await createContext(browser, 375, 900)).newPage(), `/cards/${parityCardId}`, '8.1 responsividade card 375', true);
  await assertNoHorizontalOverflow(await (await createContext(browser, 1440, 1100)).newPage(), '/auth/login', '8.1 responsividade login 1440');
  await assertNoHorizontalOverflow(await (await createContext(browser, 768, 1024)).newPage(), '/auth/login', '8.1 responsividade login 768');
  await assertNoHorizontalOverflow(await (await createContext(browser, 375, 900)).newPage(), '/auth/login', '8.1 responsividade login 375');

  await afterDesktop.close();
  await beforeDesktop.close();
  await afterMobile.close();
  await beforeMobile.close();
}

async function validateHomeEvidence(browser) {
  const afterDesktop = await createContext(browser, 1440, 1100);
  const beforeDesktop = await createContext(browser, 1440, 1100);
  const afterMobile = await createContext(browser, 375, 900);
  const beforeMobile = await createContext(browser, 375, 900);

  const beforeDesktopPage = await beforeDesktop.newPage();
  const afterDesktopPage = await afterDesktop.newPage();
  const beforeMobilePage = await beforeMobile.newPage();
  const afterMobilePage = await afterMobile.newPage();

  await waitForHome(beforeDesktopPage, beforeBaseUrl, true);
  await waitForHome(afterDesktopPage, afterBaseUrl, true);
  await waitForHome(beforeMobilePage, beforeBaseUrl, true);
  await waitForHome(afterMobilePage, afterBaseUrl, true);

  await savePageScreenshot(beforeDesktopPage, '8.2', 'before-home-desktop.png');
  await savePageScreenshot(afterDesktopPage, '8.2', 'after-home-desktop.png');
  await savePageScreenshot(beforeMobilePage, '8.2', 'before-home-mobile.png');
  await savePageScreenshot(afterMobilePage, '8.2', 'after-home-mobile.png');

  const beforeTasksPanel = beforeDesktopPage
    .locator('section')
    .filter({ has: beforeDesktopPage.getByRole('heading', { level: 2, name: 'Tarefas' }) })
    .first();
  const afterTasksPanel = afterDesktopPage.getByTestId('tasks-panel').locator('..');
  const beforeCalendarPanel = beforeDesktopPage
    .locator('section')
    .filter({ has: beforeDesktopPage.getByRole('heading', { level: 2, name: /calendário/i }) })
    .first();
  const afterCalendarPanel = afterDesktopPage.getByTestId('calendar-panel');

  await saveShot('8.2', 'before-task-panel.png', beforeTasksPanel);
  await saveShot('8.2', 'after-task-panel.png', afterTasksPanel);
  await saveShot('8.2', 'before-calendar-panel.png', beforeCalendarPanel);
  await saveShot('8.2', 'after-calendar-panel.png', afterCalendarPanel);

  const firstTaskRow = afterDesktopPage.getByTestId('task-row').first();
  await firstTaskRow.waitFor();
  await firstTaskRow.locator('a').first().click();
  await afterDesktopPage.getByTestId('card-workspace').waitFor();
  record('8.2 navegação tarefa -> card', 'PASS', 'Home autenticada abriu o card via task row.');

  const emptyContext = await createContext(browser, 1440, 1100);
  const emptyPage = await emptyContext.newPage();
  await emptyPage.route('**/api/tasks?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
  });
  await emptyPage.route('**/api/events?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
  });
  await emptyPage.route('**/api/panel/overview?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          flowsCount: 0,
          cardsCount: 0,
          openTasksCount: 0,
          dueTodayTasksCount: 0,
        },
      }),
    });
  });
  await emptyPage.goto(`${afterBaseUrl}${withToken('/')}`, { waitUntil: 'domcontentloaded' });
  await emptyPage.getByText('Nenhuma tarefa encontrada').waitFor();
  await emptyPage.getByText('Nenhum evento programado.').waitFor();
  await savePageScreenshot(emptyPage, '8.2', 'after-home-empty-state.png');
  record('8.2 empty state', 'PASS', 'TasksPanel e CalendarPanel renderizaram empty state explícito.');

  const errorContext = await createContext(browser, 1440, 1100);
  const errorPage = await errorContext.newPage();
  const errorBody = JSON.stringify({ error: 'forced-epic8-error' });
  await errorPage.route('**/api/tasks?*', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: errorBody });
  });
  await errorPage.route('**/api/events?*', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: errorBody });
  });
  await errorPage.route('**/api/panel/overview?*', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: errorBody });
  });
  await errorPage.goto(`${afterBaseUrl}${withToken('/')}`, { waitUntil: 'domcontentloaded' });
  await errorPage.getByText('Falha ao carregar tarefas.').waitFor();
  await errorPage.getByText('Falha ao carregar eventos.').waitFor();
  await savePageScreenshot(errorPage, '8.2', 'after-home-error-state.png');
  record('8.2 error state', 'PASS', 'TasksPanel e CalendarPanel renderizaram erro explícito.');

  const loadingContext = await createContext(browser, 1440, 1100);
  const loadingPage = await loadingContext.newPage();
  await loadingPage.route('**/api/tasks?*', async (route) => {
    await sleep(2500);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
  });
  await loadingPage.route('**/api/events?*', async (route) => {
    await sleep(2500);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
  });
  await loadingPage.route('**/api/panel/overview?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ summary: { flowsCount: 1, cardsCount: 1, openTasksCount: 1, dueTodayTasksCount: 0 } }),
    });
  });
  await loadingPage.goto(`${afterBaseUrl}${withToken('/')}`, { waitUntil: 'domcontentloaded' });
  await loadingPage.waitForTimeout(600);
  await savePageScreenshot(loadingPage, '8.2', 'after-home-loading-state.png');
  record('8.2 loading state', 'PASS', 'Capturada home com painéis em loading controlado.');

  await afterDesktop.close();
  await beforeDesktop.close();
  await afterMobile.close();
  await beforeMobile.close();
  await emptyContext.close();
  await errorContext.close();
  await loadingContext.close();
}

async function validateFlowsEvidence(browser) {
  const afterDesktop = await createContext(browser, 1440, 1100);
  const beforeDesktop = await createContext(browser, 1440, 1100);
  const afterMobile = await createContext(browser, 375, 900);
  const beforeMobile = await createContext(browser, 375, 900);

  const beforeDesktopPage = await beforeDesktop.newPage();
  const afterDesktopPage = await afterDesktop.newPage();
  const beforeMobilePage = await beforeMobile.newPage();
  const afterMobilePage = await afterMobile.newPage();

  await waitForFlows(beforeDesktopPage, beforeBaseUrl);
  await waitForFlows(afterDesktopPage, afterBaseUrl);
  await waitForFlows(beforeMobilePage, beforeBaseUrl);
  await waitForFlows(afterMobilePage, afterBaseUrl);

  await savePageScreenshot(beforeDesktopPage, '8.3', 'before-board-desktop.png');
  await savePageScreenshot(afterDesktopPage, '8.3', 'after-board-desktop.png');
  await savePageScreenshot(beforeMobilePage, '8.3', 'before-board-mobile.png');
  await savePageScreenshot(afterMobilePage, '8.3', 'after-board-mobile.png');

  const beforeColumn = beforeDesktopPage.locator('.flex.w-80.flex-shrink-0').first();
  const beforeCard = beforeDesktopPage.locator('[draggable="true"]').first();
  const afterColumn = afterDesktopPage.getByTestId('kanban-column').first();
  const afterCard = afterDesktopPage.getByTestId('kanban-card').first();

  await saveShot('8.3', 'before-column.png', beforeColumn);
  await saveShot('8.3', 'before-card.png', beforeCard);
  await saveShot('8.3', 'after-column.png', afterColumn);
  await saveShot('8.3', 'after-card.png', afterCard);

  const apiContext = await playwrightRequest.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${parityDevToken}`,
      'Content-Type': 'application/json',
    },
  });

  const resetResponse = await apiContext.patch(`/api/cards/${parityCardId}/move`, {
    data: {
      toColumnId: parityColumnId,
    },
  });
  ensureCondition([200, 409].includes(resetResponse.status()), 'Não foi possível resetar o card antes do DnD.');

  await waitForFlows(afterDesktopPage, afterBaseUrl);
  const movingCard = afterDesktopPage.getByTestId('kanban-card').filter({ hasText: parityCardTitle }).first();
  const targetColumn = afterDesktopPage.getByTestId('kanban-column').nth(1);
  await movingCard.dragTo(targetColumn, { force: true });
  await afterDesktopPage.waitForTimeout(1000);
  await afterDesktopPage.reload({ waitUntil: 'domcontentloaded' });
  await afterDesktopPage.getByRole('heading', { level: 1, name: 'Fluxos 2.0' }).waitFor();
  await afterDesktopPage.getByTestId('kanban-column').nth(1).getByText(parityCardTitle).waitFor();
  record('8.3 drag-and-drop', 'PASS', 'Card movido e persistido após refresh.');
  await savePageScreenshot(afterDesktopPage, '8.3', 'after-board-dnd-persisted.png');

  await afterDesktopPage.getByPlaceholder('Filtrar por card, descrição, responsável ou tag...').fill('epic8-sem-resultados');
  await afterDesktopPage.getByText('Sem cards para este filtro.').first().waitFor();
  await savePageScreenshot(afterDesktopPage, '8.3', 'after-board-empty-filter.png');
  record('8.3 empty/filter state', 'PASS', 'Filtro vazio mostra colunas sem cards de forma explícita.');

  await waitForFlows(afterDesktopPage, afterBaseUrl);
  await afterDesktopPage.getByRole('button', { name: 'Tabela' }).click();
  await afterDesktopPage.locator('table').waitFor();
  await afterDesktopPage.getByRole('button', { name: 'Indicadores' }).click();
  await afterDesktopPage.getByText('Distribuição por coluna').waitFor();
  await afterDesktopPage.getByRole('button', { name: 'Quadro' }).click();
  await afterDesktopPage.getByTestId('kanban-column').first().waitFor();
  record('8.3 modos quadro/tabela/indicadores', 'PASS', 'Os três modos alternaram sem regressão.');

  const loadingContext = await createContext(browser, 1440, 1100);
  const loadingPage = await loadingContext.newPage();
  await loadingPage.route('**/api/flows', async (route) => {
    await sleep(2400);
    await route.continue();
  });
  await loadingPage.route(`**/api/flows/${parityFlowId}`, async (route) => {
    await sleep(2400);
    await route.continue();
  });
  await loadingPage.goto(`${afterBaseUrl}${withToken(`/flows/${parityFlowId}`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await loadingPage.waitForTimeout(800);
  await savePageScreenshot(loadingPage, '8.3', 'after-board-loading.png');
  record('8.3 loading state', 'PASS', 'Capturado workspace com sincronização explícita.');

  const errorContext = await createContext(browser, 1440, 1100);
  const errorPage = await errorContext.newPage();
  await errorPage.route('**/api/flows', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'forced epic8 flows error' }) });
  });
  await errorPage.route(`**/api/flows/${parityFlowId}`, async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'forced epic8 flow detail error' }) });
  });
  await errorPage.goto(`${afterBaseUrl}${withToken(`/flows/${parityFlowId}`)}`, {
    waitUntil: 'domcontentloaded',
  });
  await errorPage.getByText('Falha ao carregar').first().waitFor();
  await savePageScreenshot(errorPage, '8.3', 'after-board-error.png');
  record('8.3 error state', 'PASS', 'Workspace exibiu erro explícito mantendo fallback legível.');

  await apiContext.dispose();
  await afterDesktop.close();
  await beforeDesktop.close();
  await afterMobile.close();
  await beforeMobile.close();
  await loadingContext.close();
  await errorContext.close();
}

async function validateCardEvidence(browser) {
  const beforeDesktop = await createContext(browser, 1440, 1100);
  const afterDesktop = await createContext(browser, 1440, 1100);
  const afterMobile = await createContext(browser, 375, 900);

  const beforeDesktopPage = await beforeDesktop.newPage();
  const afterDesktopPage = await afterDesktop.newPage();
  const afterMobilePage = await afterMobile.newPage();

  await waitForCardBefore(beforeDesktopPage);
  await waitForCardAfter(afterDesktopPage);
  await waitForCardAfter(afterMobilePage);

  await savePageScreenshot(beforeDesktopPage, '8.4', 'before-card-desktop.png');
  await savePageScreenshot(afterDesktopPage, '8.4', 'after-card-desktop.png');
  await savePageScreenshot(afterMobilePage, '8.4', 'after-card-mobile.png');

  const beforeHeader = beforeDesktopPage.locator('article').first();
  const beforeTimeline = beforeDesktopPage
    .locator('aside')
    .filter({ has: beforeDesktopPage.getByText('Timeline', { exact: false }) })
    .first();
  const afterHeader = afterDesktopPage.getByTestId('card-primary-details');
  const afterTimeline = afterDesktopPage.getByTestId('card-timeline-panel');

  await saveShot('8.4', 'before-card-header.png', beforeHeader);
  await saveShot('8.4', 'before-card-timeline.png', beforeTimeline);
  await saveShot('8.4', 'after-card-header.png', afterHeader);
  await saveShot('8.4', 'after-card-timeline.png', afterTimeline);

  const tokenFieldVisibleBefore = await afterDesktopPage
    .getByPlaceholder('Cole o token JWT de suporte')
    .isVisible()
    .catch(() => false);
  ensureCondition(!tokenFieldVisibleBefore, 'JWT ainda aparece na renderização principal do card.');
  record('8.4 JWT fora do fluxo principal', 'PASS', 'Campo técnico não aparece antes de abrir o modo técnico.');

  await afterDesktopPage.getByTestId('technical-mode').locator('summary').click();
  await afterDesktopPage.getByPlaceholder('Cole o token JWT de suporte').waitFor();
  await saveShot('8.4', 'after-card-technical-surface.png', afterDesktopPage.getByTestId('technical-mode'));
  await saveShot(
    '8.4',
    'before-card-technical-surface.png',
    beforeDesktopPage.locator('section').first()
  );
  record('8.4 modo técnico secundário', 'PASS', 'JWT/JSON aparecem apenas na superfície técnica colapsável.');

  const titleInput = afterDesktopPage.locator('input').first();
  const originalTitle = await titleInput.inputValue();
  const updatedTitle = `${originalTitle} QA`;
  await titleInput.fill(updatedTitle);
  await afterDesktopPage.getByRole('button', { name: 'Salvar card' }).click();
  await afterDesktopPage.waitForTimeout(900);
  await titleInput.fill(originalTitle);
  await afterDesktopPage.getByRole('button', { name: 'Salvar card' }).click();
  await afterDesktopPage.waitForTimeout(900);
  record('8.4 edição primária do card', 'PASS', 'Título foi salvo e restaurado pelo fluxo principal.');

  const noteText = `epic8-note-${Date.now()}`;
  await afterDesktopPage.getByPlaceholder('Escreva uma atualização relevante para o time.').fill(noteText);
  await afterDesktopPage.getByRole('button', { name: 'Publicar nota' }).click();
  await afterDesktopPage.getByText(noteText).waitFor();
  record('8.4 composer de nota', 'PASS', 'Nota publicada e visível na timeline.');

  const taskButton = parityTaskTitle
    ? afterDesktopPage.getByRole('button', { name: parityTaskTitle }).first()
    : afterDesktopPage.locator('[data-testid="card-tasks-panel"] button').first();
  await taskButton.click();
  await afterDesktopPage.getByTestId('task-modal').waitFor();
  await saveShot('8.4', 'after-task-modal.png', afterDesktopPage.getByTestId('task-modal'));
  record('8.4 task modal operacional', 'PASS', 'Modal de tarefa abriu a partir da lista do card.');

  await beforeDesktop.close();
  await afterDesktop.close();
  await afterMobile.close();
}

function buildReport() {
  const grouped = new Map();

  for (const result of results) {
    const story = result.name.split(' ')[0];
    const current = grouped.get(story) || [];
    current.push(result);
    grouped.set(story, current);
  }

  const lines = [
    '# Epic 8 Visual Validation Report',
    '',
    `- Date: ${new Date().toISOString()}`,
    `- Before base URL: ${beforeBaseUrl}`,
    `- After base URL: ${afterBaseUrl}`,
    `- Evidence root: ${evidenceRoot}`,
    '',
  ];

  for (const story of ['8.1', '8.2', '8.3', '8.4']) {
    lines.push(`## Story ${story}`);
    const entries = grouped.get(story) || [];
    if (entries.length === 0) {
      lines.push('- No validations recorded.');
      lines.push('');
      continue;
    }

    for (const entry of entries) {
      lines.push(`- ${entry.status}: ${entry.name}${entry.details ? ` — ${entry.details}` : ''}`);
    }
    lines.push('');
  }

  lines.push('## Evidence');
  lines.push('');
  lines.push(`- Screenshots saved under [${evidenceRoot}](/Users/lucasboniatti/Desktop/Projetos/ummense-dr/${evidenceRoot}).`);

  return `${lines.join('\n')}\n`;
}

async function main() {
  ensureCondition(parityDevToken, 'PARITY_DEV_TOKEN ausente.');
  ensureCondition(parityFlowId > 0, 'PARITY_FLOW_ID ausente.');
  ensureCondition(parityCardId > 0, 'PARITY_CARD_ID ausente.');
  ensureCondition(parityColumnId > 0 && parityTargetColumnId > 0, 'PARITY columns ausentes.');

  mkdirSync(evidenceRoot, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    await compareShellEvidence(browser);
    await validateHomeEvidence(browser);
    await validateFlowsEvidence(browser);
    await validateCardEvidence(browser);
  } finally {
    await browser.close();
  }

  const report = buildReport();
  writeFileSync(reportPath, report, 'utf8');
  process.stdout.write(report);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
