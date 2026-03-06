import assert from 'node:assert/strict';
import test from 'node:test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN || '';

interface ApiResponse<T> {
  status: number;
  body: T | null;
}

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload: T | null = null;
  try {
    payload = (await response.json()) as T;
  } catch {
    payload = null;
  }

  return {
    status: response.status,
    body: payload,
  };
}

test('contract: GET /api/flows + GET /api/flows/:id returns expected shape', async (t) => {
  if (!AUTH_TOKEN) {
    t.skip('Set E2E_AUTH_TOKEN to run real authenticated contract tests');
    return;
  }

  const flowName = `Flow Contract ${Date.now()}`;
  const createFlow = await request<{ id: number }>('POST', '/api/flows', {
    name: flowName,
  });

  assert.equal(createFlow.status, 201);
  assert.ok(createFlow.body?.id);

  const listFlows = await request<
    Array<{
      id: number;
      name: string;
      indicators: {
        activeCards: number;
        completedCards: number;
        blockedCards: number;
        throughput: number;
      };
    }>
  >('GET', '/api/flows');

  assert.equal(listFlows.status, 200);
  assert.ok(Array.isArray(listFlows.body));

  const created = (listFlows.body || []).find((flow) => flow.id === createFlow.body?.id);
  assert.ok(created);
  assert.equal(created?.name, flowName);
  assert.equal(typeof created?.indicators.activeCards, 'number');
  assert.equal(typeof created?.indicators.completedCards, 'number');
  assert.equal(typeof created?.indicators.blockedCards, 'number');
  assert.equal(typeof created?.indicators.throughput, 'number');

  const flowDetails = await request<{
    id: number;
    columns: Array<{ id: number; name: string; cards: unknown[] }>;
    indicators: {
      activeCards: number;
      completedCards: number;
      blockedCards: number;
      throughput: number;
    };
  }>('GET', `/api/flows/${createFlow.body?.id}`);

  assert.equal(flowDetails.status, 200);
  assert.equal(flowDetails.body?.id, createFlow.body?.id);
  assert.ok(Array.isArray(flowDetails.body?.columns));
  assert.ok((flowDetails.body?.columns || []).length >= 2);
  assert.equal(typeof flowDetails.body?.indicators.activeCards, 'number');
});

test('contract: PATCH /api/cards/:id/move persists card movement', async (t) => {
  if (!AUTH_TOKEN) {
    t.skip('Set E2E_AUTH_TOKEN to run real authenticated contract tests');
    return;
  }

  const flowName = `Flow Move ${Date.now()}`;
  const createFlow = await request<{ id: number }>('POST', '/api/flows', {
    name: flowName,
  });

  assert.equal(createFlow.status, 201);
  const flowId = createFlow.body?.id as number;

  const flowDetails = await request<{
    columns: Array<{ id: number; name: string }>;
  }>('GET', `/api/flows/${flowId}`);

  assert.equal(flowDetails.status, 200);
  const firstColumn = flowDetails.body?.columns?.[0];
  const secondColumn = flowDetails.body?.columns?.[1];
  assert.ok(firstColumn?.id);
  assert.ok(secondColumn?.id);

  const cardTitle = `Card Move ${Date.now()}`;
  const createCard = await request<{ id: number; columnId: number }>('POST', '/api/cards', {
    title: cardTitle,
    columnId: firstColumn?.id,
  });

  assert.equal(createCard.status, 201);
  const cardId = createCard.body?.id as number;
  assert.equal(createCard.body?.columnId, firstColumn?.id);

  const moveCard = await request<{ id: number; columnId: number }>(
    'PATCH',
    `/api/cards/${cardId}/move`,
    { toColumnId: secondColumn?.id }
  );

  assert.equal(moveCard.status, 200);
  assert.equal(moveCard.body?.id, cardId);
  assert.equal(moveCard.body?.columnId, secondColumn?.id);

  const moveConflict = await request<{ error?: string }>(
    'PATCH',
    `/api/cards/${cardId}/move`,
    { toColumnId: secondColumn?.id }
  );
  assert.equal(moveConflict.status, 409);
  assert.equal(moveConflict.body?.error, 'Card is already in target column');

  const afterMoveDetails = await request<{
    columns: Array<{ id: number; cards: Array<{ id: number }> }>;
  }>('GET', `/api/flows/${flowId}`);

  assert.equal(afterMoveDetails.status, 200);
  const movedColumn = (afterMoveDetails.body?.columns || []).find(
    (column) => column.id === secondColumn?.id
  );
  assert.ok((movedColumn?.cards || []).some((card) => card.id === cardId));
});
