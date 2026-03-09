import schedule, { Job } from 'node-schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { CostSnapshotService } from '../services/cost-snapshot.service';

const COST_JOB_NAME = 'nightly-cost-snapshot';
const COST_JOB_SCHEDULE = process.env.COST_JOB_SCHEDULE || '0 2 * * *';
const COST_JOB_RETRY_MAX = Number(process.env.COST_JOB_RETRY_MAX || '3');
const COST_JOB_RETRY_DELAY_MS = Number(process.env.COST_JOB_RETRY_DELAY_MS || '300000');

let nightlyJob: Job | null = null;
let currentStatus: 'scheduled' | 'running' | 'failed' = 'scheduled';
let lastExecutionAt: Date | undefined;

interface JobResult {
  userId: string;
  success: boolean;
  error?: string;
  savings?: number;
}

export function initNightlyCostSnapshotJob(
  supabase: SupabaseClient,
  costService: CostSnapshotService = new CostSnapshotService(supabase)
): Job {
  if (nightlyJob) {
    return nightlyJob;
  }

  nightlyJob = schedule.scheduleJob(COST_JOB_NAME, COST_JOB_SCHEDULE, async () => {
    currentStatus = 'running';
    lastExecutionAt = new Date();

    try {
      await runNightlyCostSnapshotJob(supabase, costService);
      currentStatus = 'scheduled';
    } catch (error) {
      currentStatus = 'failed';
      console.error('[NightlyCostSnapshot] Fatal job error:', error);
      await alertOps('Nightly cost snapshot job failed', error);
    }
  });

  console.log(`[NightlyCostSnapshot] Scheduled job ${COST_JOB_NAME} at ${COST_JOB_SCHEDULE}`);
  return nightlyJob;
}

export async function runNightlyCostSnapshotJob(
  supabase: SupabaseClient,
  costService: CostSnapshotService = new CostSnapshotService(supabase)
): Promise<void> {
  const activeUserIds = await getAllActiveUsers(supabase);
  const results: JobResult[] = [];

  for (const userId of activeUserIds) {
    const result = await processUserWithRetry(costService, userId);
    results.push(result);
  }

  const failures = results.filter((result) => !result.success);
  if (failures.length > 0) {
    await alertOps(
      `Nightly cost snapshot job had ${failures.length} failures`,
      failures.map((result) => `${result.userId}: ${result.error}`).join(', ')
    );
  }
}

async function processUserWithRetry(
  costService: CostSnapshotService,
  userId: string,
  attempt: number = 1
): Promise<JobResult> {
  try {
    const snapshot = await costService.captureDailySnapshot(userId);
    await costService.validateCostAccuracy(snapshot);

    return {
      userId,
      success: true,
      savings: snapshot.monthlySavings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (attempt < COST_JOB_RETRY_MAX) {
      const delay = COST_JOB_RETRY_DELAY_MS * 2 ** (attempt - 1);
      await wait(delay);
      return processUserWithRetry(costService, userId, attempt + 1);
    }

    return {
      userId,
      success: false,
      error: message,
    };
  }
}

async function getAllActiveUsers(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('automations')
    .select('user_id')
    .neq('user_id', null);

  if (error) {
    throw new Error(`Failed to fetch active users: ${error.message}`);
  }

  const uniqueIds = new Set(
    (data || [])
      .map((row: { user_id?: string | null }) => row.user_id || '')
      .filter(Boolean)
  );

  return [...uniqueIds];
}

async function alertOps(title: string, details: string | Error): Promise<void> {
  const message =
    typeof details === 'string'
      ? details
      : `${details.message}\n${details.stack || 'No stack trace'}`;

  console.error(`\n${'='.repeat(60)}\nALERT: ${title}\n${message}\n${'='.repeat(60)}\n`);
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function triggerCostSnapshotJobManually(
  supabase: SupabaseClient,
  costService: CostSnapshotService = new CostSnapshotService(supabase)
): Promise<void> {
  return runNightlyCostSnapshotJob(supabase, costService);
}

export function getCostSnapshotJobStatus(): {
  schedule: string;
  lastExecution?: Date;
  nextExecution?: Date;
  status: 'scheduled' | 'running' | 'failed';
} {
  const nextInvocation = nightlyJob?.nextInvocation();

  return {
    schedule: COST_JOB_SCHEDULE,
    lastExecution: lastExecutionAt,
    nextExecution: nextInvocation ? new Date(nextInvocation) : undefined,
    status: nightlyJob ? currentStatus : 'failed',
  };
}
