import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSupabaseClient } from './helpers/fake-supabase';

const scheduleJobMock = vi.fn();

vi.mock('node-schedule', () => ({
  default: {
    scheduleJob: scheduleJobMock,
  },
  scheduleJob: scheduleJobMock,
}));

describe('nightly cost snapshot job', () => {
  beforeEach(() => {
    vi.resetModules();
    scheduleJobMock.mockReset();
  });

  it('schedules the nightly job once and exposes the next execution', async () => {
    scheduleJobMock.mockReturnValue({
      cancel: vi.fn(),
      nextInvocation: () => new Date('2026-03-10T02:00:00.000Z'),
    });

    const { initNightlyCostSnapshotJob, getCostSnapshotJobStatus } = await import(
      '../jobs/nightly-cost-snapshot'
    );

    const supabase = new FakeSupabaseClient();
    const costService = {
      captureDailySnapshot: vi.fn(),
      validateCostAccuracy: vi.fn(),
    };

    initNightlyCostSnapshotJob(supabase as any, costService as any);
    const status = getCostSnapshotJobStatus();

    expect(scheduleJobMock).toHaveBeenCalledTimes(1);
    expect(scheduleJobMock.mock.calls[0][0]).toBe('nightly-cost-snapshot');
    expect(status.status).toBe('scheduled');
    expect(status.nextExecution?.toISOString()).toBe('2026-03-10T02:00:00.000Z');
  });

  it('processes active users when triggered manually', async () => {
    const { triggerCostSnapshotJobManually } = await import('../jobs/nightly-cost-snapshot');

    const supabase = new FakeSupabaseClient();
    supabase.tables.automations.push(
      { id: 'auto-1', user_id: 'user-1' },
      { id: 'auto-2', user_id: 'user-1' },
      { id: 'auto-3', user_id: 'user-2' }
    );

    const captureDailySnapshot = vi
      .fn()
      .mockResolvedValueOnce({ monthlySavings: 11, accuracy: 95 })
      .mockResolvedValueOnce({ monthlySavings: 7, accuracy: 95 });
    const validateCostAccuracy = vi.fn().mockResolvedValue(true);

    await triggerCostSnapshotJobManually(supabase as any, {
      captureDailySnapshot,
      validateCostAccuracy,
    } as any);

    expect(captureDailySnapshot).toHaveBeenCalledTimes(2);
    expect(captureDailySnapshot).toHaveBeenNthCalledWith(1, 'user-1');
    expect(captureDailySnapshot).toHaveBeenNthCalledWith(2, 'user-2');
    expect(validateCostAccuracy).toHaveBeenCalledTimes(2);
  });
});
