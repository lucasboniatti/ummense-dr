import assert from 'node:assert/strict';
import test from 'node:test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN || '';

interface TimedResponse<T> {
  status: number;
  body: T | null;
  durationMs: number;
}

function percentile95(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<TimedResponse<T>> {
  const start = performance.now();
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
    durationMs: performance.now() - start,
  };
}

test('performance: card move roundtrip p95 <= 800ms', async (t) => {
  if (!AUTH_TOKEN) {
    t.skip('Set E2E_AUTH_TOKEN to run real authenticated performance tests');
    return;
  }

  const flowName = `Perf Move ${Date.now()}`;
  const flow = await request<{ id: number }>('POST', '/api/flows', { name: flowName });
  assert.equal(flow.status, 201);
  assert.ok(flow.body?.id);

  const details = await request<{ columns: Array<{ id: number }> }>(
    'GET',
    `/api/flows/${flow.body?.id}`
  );
  assert.equal(details.status, 200);
  const sourceColumnId = details.body?.columns?.[0]?.id;
  const targetColumnId = details.body?.columns?.[1]?.id;
  assert.ok(sourceColumnId);
  assert.ok(targetColumnId);

  const card = await request<{ id: number }>('POST', '/api/cards', {
    title: `Perf Card ${Date.now()}`,
    columnId: sourceColumnId,
  });
  assert.equal(card.status, 201);
  assert.ok(card.body?.id);

  const cardId = card.body?.id as number;
  const durations: number[] = [];
  let currentTarget = targetColumnId as number;

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const move = await request<{ id: number; columnId: number }>(
      'PATCH',
      `/api/cards/${cardId}/move`,
      { toColumnId: currentTarget }
    );

    assert.equal(move.status, 200);
    assert.equal(move.body?.id, cardId);
    durations.push(move.durationMs);
    currentTarget = currentTarget === targetColumnId ? (sourceColumnId as number) : (targetColumnId as number);
  }

  const p95 = percentile95(durations);
  assert.ok(p95 <= 800, `expected p95 <= 800ms, received ${p95.toFixed(2)}ms`);
});

test('performance: flow details load p95 <= 2000ms with 500 cards', async (t) => {
  if (!AUTH_TOKEN) {
    t.skip('Set E2E_AUTH_TOKEN to run real authenticated performance tests');
    return;
  }

  const flowName = `Perf Dataset ${Date.now()}`;
  const flow = await request<{ id: number }>('POST', '/api/flows', { name: flowName });
  assert.equal(flow.status, 201);
  const flowId = flow.body?.id as number;

  const details = await request<{ columns: Array<{ id: number }> }>('GET', `/api/flows/${flowId}`);
  assert.equal(details.status, 200);
  const columns = details.body?.columns || [];
  assert.ok(columns.length >= 4);

  const cardsToCreate = 500;
  const batchSize = 20;
  const payloads = Array.from({ length: cardsToCreate }).map((_, index) => ({
    title: `Perf Seed Card ${index + 1} ${Date.now()}`,
    columnId: columns[index % columns.length].id,
  }));

  for (let start = 0; start < payloads.length; start += batchSize) {
    const batch = payloads.slice(start, start + batchSize);
    const createBatch = await Promise.all(
      batch.map((payload) => request<{ id: number }>('POST', '/api/cards', payload))
    );
    createBatch.forEach((result) => assert.equal(result.status, 201));
  }

  const durations: number[] = [];
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const flowDetails = await request('GET', `/api/flows/${flowId}`);
    assert.equal(flowDetails.status, 200);
    durations.push(flowDetails.durationMs);
  }

  const p95 = percentile95(durations);
  assert.ok(p95 <= 2000, `expected p95 <= 2000ms, received ${p95.toFixed(2)}ms`);
});
