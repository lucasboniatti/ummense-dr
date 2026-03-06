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

function hasAuthenticatedFixture(): boolean {
  return Boolean(parityDevToken && parityCardId > 0 && parityTaskId > 0);
}

function hasFlowsFixture(): boolean {
  return Boolean(parityFlowId > 0 && parityColumnId > 0 && parityTargetColumnId > 0 && parityCardTitle);
}

function withToken(pathname: string): string {
  const token = encodeURIComponent(parityDevToken);
  return `${pathname}${pathname.includes('?') ? '&' : '?'}devToken=${token}`;
}

async function captureEvidence(page: Page, filename: string) {
  await page.screenshot({
    path: join(evidenceDir, filename),
    fullPage: true,
  });
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
  test('jornada painel + fluxos responde 200', async ({ page }) => {
    test.slow();
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Painel Consolidado de Operações' })
    ).toBeVisible();

    await page.goto('/dashboard/automations');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Fluxos 2.0' })
    ).toBeVisible({ timeout: 20_000 });

    await captureEvidence(page, '01-painel-fluxos.png');
  });

  test('jornada card workspace responde 200', async ({ page }) => {
    await page.goto('/cards/1');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Card Workspace 2.0' })
    ).toBeVisible();

    await captureEvidence(page, '02-card-workspace-basico.png');
  });

  test('jornada webhooks local responde 200', async ({ page }) => {
    await page.goto('/dashboard/webhooks/local');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Webhooks - Fluxo Crítico Local' })
    ).toBeVisible();

    await captureEvidence(page, '03-webhooks-basico.png');
  });
});

test.describe('Product Parity E2E (authenticated)', () => {
  test.skip(!hasAuthenticatedFixture(), 'Set PARITY_DEV_TOKEN, PARITY_CARD_ID and PARITY_TASK_ID');

  test('card workspace mostra contexto de equipe e timeline', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}`));

    await expect(
      page.getByRole('heading', { level: 1, name: 'Card Workspace 2.0' })
    ).toBeVisible();
    await expect(page.getByText('Líder:', { exact: false })).toBeVisible();
    await expect(page.getByText('Timeline', { exact: false })).toBeVisible();

    await captureEvidence(page, '04-card-workspace-autenticado.png');
  });

  test('card workspace permite salvar card e registrar nota na timeline', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}`));

    const editedTitle = `Card QA ${Date.now()}`;
    const noteText = `qa-note-${Date.now()}`;

    const cardArticle = page.locator('article').first();
    await cardArticle.locator('input').first().fill(editedTitle);
    await page.getByRole('button', { name: 'Salvar card' }).click();

    await expect(
      page.locator('article').first().getByRole('heading', { level: 2, name: editedTitle })
    ).toBeVisible();

    await page.getByPlaceholder('Adicionar nota...').fill(noteText);
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText(noteText)).toBeVisible();

    await captureEvidence(page, '04b-card-save-timeline.png');
  });

  test('task modal abre por entrada de painel (query taskId)', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}?taskId=${parityTaskId}`));

    await expect(
      page.getByRole('heading', { level: 2, name: 'Editar tarefa' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Histórico da tarefa' })
    ).toBeVisible();

    const modalSection = page.locator('div.fixed section').first();
    await modalSection.locator('select').nth(1).selectOption('in_progress');
    const saveTaskButton = page
      .locator('div.fixed')
      .getByRole('button', { name: 'Salvar alterações' });
    await saveTaskButton.scrollIntoViewIfNeeded();
    await saveTaskButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    await page.goto(withToken(`/cards/${parityCardId}?taskId=${parityTaskId}`));
    await expect(page.getByText('task.updated').first()).toBeVisible();

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
      : page
          .locator('section')
          .filter({ hasText: 'Tarefas do card' })
          .getByRole('button')
          .first();

    await taskButton.click();

    await expect(
      page.getByRole('heading', { level: 2, name: 'Editar tarefa' })
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

    const filterInput = page.getByPlaceholder('Filtrar por texto (card, descrição, responsável, tag...)');
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

    const columns = page.locator('.flex.w-80.flex-shrink-0');
    const sourceColumn = columns.nth(0);
    const targetColumn = columns.nth(1);
    const targetDropZone = targetColumn.locator('.space-y-2').first();

    const movingCard = sourceColumn
      .locator('[draggable="true"]')
      .filter({ hasText: currentCardTitle })
      .first();
    await expect(movingCard).toBeVisible();
    await targetDropZone.scrollIntoViewIfNeeded();
    await movingCard.dragTo(targetDropZone, { force: true });
    await expect(targetColumn.getByText(currentCardTitle)).toBeVisible();

    await page.reload();
    const reloadedColumns = page.locator('.flex.w-80.flex-shrink-0');
    await expect(
      reloadedColumns.nth(1).getByText(currentCardTitle)
    ).toBeVisible();

    await captureEvidence(page, '04c-flows-dnd-persistence.png');
  });

  test('calendário reflete due date da tarefa no painel', async ({ page }) => {
    await page.goto(withToken(`/cards/${parityCardId}?taskId=${parityTaskId}`));

    await expect(
      page.getByRole('heading', { level: 2, name: 'Editar tarefa' })
    ).toBeVisible();

    const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const localDueDate = dueDate.toISOString().slice(0, 10);
    await page.locator('div.fixed input[type="date"]').first().fill(localDueDate);

    const saveTaskButton = page
      .locator('div.fixed')
      .getByRole('button', { name: 'Salvar alterações' });
    await saveTaskButton.scrollIntoViewIfNeeded();
    await saveTaskButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    await page.goto(withToken('/'));
    await expect(page.getByText(`Prazo: ${parityTaskTitle}`)).toBeVisible();

    await captureEvidence(page, '09b-calendar-due-date-reflection.png');
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

    await page.locator('div.fixed input[type="text"]').first().fill(eventTitle);
    await page.locator('div.fixed input[type="datetime-local"]').first().fill(startsAt);
    const createButton = page.locator('div.fixed').getByRole('button', { name: 'Criar evento' });
    await createButton.scrollIntoViewIfNeeded();
    await createButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

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

    await page.locator('div.fixed input[type="text"]').first().fill(updatedEventTitle);
    const saveButton = page.locator('div.fixed').getByRole('button', { name: 'Salvar evento' });
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });

    await expect(page.getByText(updatedEventTitle)).toBeVisible();

    const updatedEventRow = page.locator('li').filter({ hasText: updatedEventTitle }).first();
    await updatedEventRow.getByRole('button', { name: 'Editar' }).click();
    const deleteButton = page.locator('div.fixed').getByRole('button', { name: 'Remover evento' });
    await deleteButton.scrollIntoViewIfNeeded();
    await deleteButton.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await expect(page.getByText(updatedEventTitle)).toHaveCount(0);

    await captureEvidence(page, '09-calendar-event-lifecycle.png');
  });

  test('webhooks local lista webhook real com token aplicado', async ({ page }) => {
    await page.goto('/dashboard/webhooks/local');

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
