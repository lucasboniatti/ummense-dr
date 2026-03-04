import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN || '';

test.describe('E2E: Execution History APIs (real HTTP)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!AUTH_TOKEN, 'Set E2E_AUTH_TOKEN to run real authenticated E2E tests');

    const health = await request.get(`${API_BASE_URL}/health`);
    expect(health.ok()).toBeTruthy();
  });

  test('should query execution history with authenticated request', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/automations/history?limit=10&offset=0`,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(Array.isArray(payload.executions)).toBeTruthy();
    expect(typeof payload.total).toBe('number');
  });

  test('should fetch search suggestions from API', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/automations/history/suggestions?limit=5`,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(Array.isArray(payload.suggestions)).toBeTruthy();
  });

  test('should export execution history as JSON', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/automations/history/export/json?limit=10`,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.text();
    expect(body.length).toBeGreaterThan(1);
  });
});
