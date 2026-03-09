import { beforeEach, describe, expect, it } from 'vitest';
import { CostSnapshotService } from '../services/cost-snapshot.service';
import { FakeSupabaseClient } from './helpers/fake-supabase';

describe('CostSnapshotService', () => {
  let supabase: FakeSupabaseClient;

  beforeEach(() => {
    supabase = new FakeSupabaseClient();
  });

  it('calculates estimated savings when no archive bucket is configured', async () => {
    seedExecutionHistory(supabase, 'user-1', 1200);

    const service = new CostSnapshotService(supabase as any, {
      now: () => new Date('2026-03-09T10:00:00.000Z'),
    });

    const metrics = await service.calculateUserCostMetrics('user-1');

    expect(metrics.dbStorageGb).toBeGreaterThan(0);
    expect(metrics.s3StorageGb).toBeGreaterThan(0);
    expect(metrics.monthlySavings).toBeGreaterThan(0);
    expect(metrics.isEstimate).toBe(true);
    expect(metrics.accuracy).toBe(95);
  });

  it('uses actual archived bytes when retention policy points to an archive bucket', async () => {
    seedExecutionHistory(supabase, 'user-archive', 2400);
    supabase.tables.user_retention_policies.push({
      user_id: 'user-archive',
      archive_enabled: true,
      archive_bucket: 'bucket-1',
    });

    const service = new CostSnapshotService(supabase as any, {
      archivalStorageProvider: async () => 32 * 1024 * 1024,
      now: () => new Date('2026-03-09T10:00:00.000Z'),
    });

    const metrics = await service.calculateUserCostMetrics('user-archive');

    expect(metrics.archivedStorageGb).toBeGreaterThan(0);
    expect(metrics.s3StorageGb).toBe(metrics.archivedStorageGb);
    expect(metrics.isEstimate).toBe(false);
    expect(metrics.compressionRatio).toBeGreaterThanOrEqual(1);
  });

  it('captures at most one snapshot per UTC day', async () => {
    seedExecutionHistory(supabase, 'user-1', 1600);

    const service = new CostSnapshotService(supabase as any, {
      now: () => new Date('2026-03-09T02:00:00.000Z'),
    });

    const first = await service.captureDailySnapshot('user-1');
    const second = await service.captureDailySnapshot('user-1');

    expect(first.id).toBe(second.id);
    expect(supabase.tables.cost_snapshots).toHaveLength(1);
  });

  it('builds a summary with 7-day storage growth trend from persisted snapshots', async () => {
    const timestamps = [
      '2026-03-03T02:00:00.000Z',
      '2026-03-04T02:00:00.000Z',
      '2026-03-05T02:00:00.000Z',
      '2026-03-06T02:00:00.000Z',
      '2026-03-07T02:00:00.000Z',
      '2026-03-08T02:00:00.000Z',
      '2026-03-09T02:00:00.000Z',
    ];

    timestamps.forEach((timestamp, index) => {
      supabase.tables.cost_snapshots.push({
        id: `snapshot-${index + 1}`,
        user_id: 'user-1',
        timestamp,
        db_storage_gb: 1 + index * 0.1,
        s3_storage_gb: 0.1 + index * 0.05,
        db_cost_monthly: 1.5 + index * 0.15,
        s3_cost_monthly: 0.01 + index * 0.01,
        monthly_savings: 1.49 + index * 0.14,
        seven_year_savings: 125 + index * 12,
        compression_ratio: 3.5,
        accuracy_percent: 95,
      });
    });

    const service = new CostSnapshotService(supabase as any);
    const summary = await service.getCostSummary('user-1');

    expect(summary.storageGrowthTrend).toHaveLength(7);
    expect(summary.monthlySavings).toBeGreaterThan(0);
    expect(['up', 'down', 'stable']).toContain(summary.trend);
    expect(summary.lastUpdatedAt).toBe('2026-03-09T02:00:00.000Z');
  });
});

function seedExecutionHistory(
  supabase: FakeSupabaseClient,
  userId: string,
  count: number
) {
  supabase.tables.execution_histories.push(
    ...Array.from({ length: count }, (_, index) => ({
      id: `exec-${index + 1}`,
      user_id: userId,
      automation_id: 'automation-1',
      status: index % 5 === 0 ? 'failed' : 'success',
      trigger_type: 'manual',
      trigger_data: {
        payload: 'x'.repeat(4096),
      },
      started_at: '2026-03-09T00:00:00.000Z',
      completed_at: '2026-03-09T00:05:00.000Z',
      duration_ms: 1200 + index,
      error_context: index % 5 === 0 ? { message: 'timeout' } : null,
      created_at: `2026-03-${String((index % 9) + 1).padStart(2, '0')}T00:00:00.000Z`,
    }))
  );
}
