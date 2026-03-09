import { AddressInfo } from 'node:net';
import express from 'express';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnalyticsRoutes } from '../routes/analytics.routes';

const JWT_SECRET = 'analytics-test-secret';

describe('GET /api/analytics/cost-summary', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  it('returns the user-scoped cost summary payload', async () => {
    const getCostSummary = vi.fn().mockResolvedValue({
      dbCost: 14.2,
      s3Cost: 0.38,
      monthlySavings: 13.82,
      sevenYearProjection: 1160.88,
      storageGrowthTrend: [{ date: '2026-03-09T02:00:00.000Z', archivalRateGbPerDay: 0.15 }],
      accuracy: 95,
      dbStorageGb: 9.46,
      s3StorageGb: 0.28,
      archivedStorageGb: 0.28,
      compressionRatio: 3.5,
      trend: 'down',
      trendLabel: 'economia aumentando',
      lastUpdatedAt: '2026-03-09T02:00:00.000Z',
      isEstimate: false,
    });

    const app = express();
    app.use(
      '/api/analytics',
      createAnalyticsRoutes({
        costSnapshotService: {
          getCostSummary,
        } as any,
      })
    );

    const token = jwt.sign({ id: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });
    const response = await makeRequest(app, '/api/analytics/cost-summary', token);

    expect(response.status).toBe(200);
    expect(getCostSummary).toHaveBeenCalledWith('user-1');
    expect(response.body.monthlySavings).toBe(13.82);
    expect(response.body.trend).toBe('down');
  });

  it('rejects unauthenticated requests', async () => {
    const app = express();
    app.use(
      '/api/analytics',
      createAnalyticsRoutes({
        costSnapshotService: {
          getCostSummary: vi.fn(),
        } as any,
      })
    );

    const response = await makeRequest(app, '/api/analytics/cost-summary');
    expect(response.status).toBe(401);
  });
});

async function makeRequest(app: express.Express, path: string, token?: string) {
  const server = await new Promise<ReturnType<express.Express['listen']>>((resolve) => {
    const started = app.listen(0, () => resolve(started));
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  const body = await response.json().catch(() => null);

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return {
    status: response.status,
    body,
  };
}
