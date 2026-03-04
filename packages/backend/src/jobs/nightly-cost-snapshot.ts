/**
 * Nightly Cost Snapshot Job — Story 3.6.4
 *
 * Scheduled job that runs daily at 2:00 AM UTC to calculate and persist cost snapshots.
 *
 * Responsibilities:
 * 1. Query all active users
 * 2. For each user: Calculate DB storage, S3 storage, cost metrics
 * 3. Persist snapshot to cost_snapshots table
 * 4. Retry failed users with exponential backoff
 * 5. Alert ops on final failure
 *
 * Schedule: 0 2 * * * (2:00 AM UTC daily)
 * Retry: 3 attempts with 5-minute backoff
 * Timeout: 30 minutes per job cycle
 *
 * Usage:
 * import { initNightlyCostSnapshotJob } from './nightly-cost-snapshot';
 * initNightlyCostSnapshotJob(supabaseClient);
 */

import * as schedule from 'node-schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { CostSnapshotService } from '../services/cost-snapshot.service';

const COST_JOB_SCHEDULE = process.env.COST_JOB_SCHEDULE || '0 2 * * *'; // 2:00 AM UTC
const COST_JOB_RETRY_MAX = parseInt(process.env.COST_JOB_RETRY_MAX || '3', 10);
const COST_JOB_RETRY_DELAY_MS = parseInt(process.env.COST_JOB_RETRY_DELAY_MS || '300000', 10); // 5 minutes

interface JobResult {
  userId: string;
  success: boolean;
  error?: string;
  savings?: number; // Monthly savings in $
}

/**
 * Initialize the nightly cost snapshot job
 * Should be called once during app startup
 */
export function initNightlyCostSnapshotJob(supabase: SupabaseClient): void {
  console.log(`[NightlyCostSnapshot] Scheduling job: ${COST_JOB_SCHEDULE}`);

  schedule.scheduleJob(COST_JOB_SCHEDULE, async () => {
    try {
      await runNightlyCostSnapshotJob(supabase);
    } catch (error) {
      console.error('[NightlyCostSnapshot] Fatal job error:', error);
      await alertOps('Nightly cost snapshot job failed', error);
    }
  });

  console.log('[NightlyCostSnapshot] Job initialized');
}

/**
 * Main job execution function
 * Fetches all active users and creates cost snapshots
 */
async function runNightlyCostSnapshotJob(supabase: SupabaseClient): Promise<void> {
  const startTime = Date.now();
  const costService = new CostSnapshotService(supabase);

  console.log('[NightlyCostSnapshot] Starting nightly cost snapshot job...');

  try {
    // 1. Get all active users (users with at least one automation)
    const activeUserIds = await getAllActiveUsers(supabase);
    console.log(`[NightlyCostSnapshot] Processing ${activeUserIds.length} active users`);

    const results: JobResult[] = [];

    // 2. Process each user
    for (const userId of activeUserIds) {
      const result = await processUserWithRetry(supabase, costService, userId);
      results.push(result);

      if (result.success) {
        console.log(`[NightlyCostSnapshot] ✓ User ${userId}: saved $${result.savings?.toFixed(2) || 0}/month`);
      } else {
        console.error(`[NightlyCostSnapshot] ✗ User ${userId}: ${result.error}`);
      }
    }

    // 3. Summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const totalSavings = results.reduce((sum, r) => sum + (r.savings || 0), 0);
    const duration = Date.now() - startTime;

    console.log(
      `[NightlyCostSnapshot] Job complete: ${successCount}/${activeUserIds.length} ✓, ${failureCount} ✗, $${totalSavings.toFixed(2)}/month total savings, ${duration}ms`
    );

    // 4. Alert if failures occurred
    if (failureCount > 0) {
      const failedUsers = results.filter((r) => !r.success);
      await alertOps(
        `Nightly cost snapshot job had ${failureCount} failures`,
        `Failed users: ${failedUsers.map((r) => `${r.userId} (${r.error})`).join(', ')}`
      );
    }
  } catch (error) {
    console.error('[NightlyCostSnapshot] Unexpected error during job execution:', error);
    throw error;
  }
}

/**
 * Process a single user with retry logic
 * Retries on failure with exponential backoff
 */
async function processUserWithRetry(
  supabase: SupabaseClient,
  costService: CostSnapshotService,
  userId: string,
  attempt: number = 1
): Promise<JobResult> {
  try {
    // 1. Calculate cost metrics
    const metrics = await costService.calculateUserCostMetrics(userId);

    // 2. Persist snapshot
    const snapshot = await costService.insertCostSnapshot(userId, metrics);

    // 3. Validate accuracy
    await costService.validateCostAccuracy(snapshot);

    return {
      userId,
      success: true,
      savings: metrics.monthlySavings,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Retry logic
    if (attempt < COST_JOB_RETRY_MAX) {
      console.warn(
        `[NightlyCostSnapshot] Retry ${attempt}/${COST_JOB_RETRY_MAX} for user ${userId} after ${COST_JOB_RETRY_DELAY_MS}ms...`
      );

      // Exponential backoff: delay * (2 ^ (attempt - 1))
      const backoffDelay = COST_JOB_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));

      return processUserWithRetry(supabase, costService, userId, attempt + 1);
    }

    // Final failure after all retries
    console.error(`[NightlyCostSnapshot] Final failure for user ${userId}: ${errorMessage}`);
    return {
      userId,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get all active users (users with automations)
 * Optimized query to minimize data transfer
 */
async function getAllActiveUsers(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('automations')
    .select('user_id')
    .neq('user_id', null);

  if (error) {
    console.error('[NightlyCostSnapshot] Error fetching active users:', error);
    throw new Error(`Failed to fetch active users: ${error.message}`);
  }

  const userIds = data?.map((row: { user_id: string }) => row.user_id).filter((id): id is string => !!id) || [];
  return [...new Set(userIds)]; // Remove duplicates
}

/**
 * Alert operations team on job failure
 * In production, would send to Slack, PagerDuty, or monitoring system
 */
async function alertOps(title: string, details: string | Error): Promise<void> {
  const message =
    typeof details === 'string'
      ? details
      : `${details.message}\n${details.stack || 'No stack trace'}`;

  // Log to stdout (would be picked up by logging infrastructure)
  console.error(`\n${'='.repeat(60)}\nALERT: ${title}\n${message}\n${'='.repeat(60)}\n`);

  // TODO: In production, integrate with:
  // - Slack: Send to #ops-alerts channel
  // - PagerDuty: Create incident if critical
  // - CloudWatch: Log to monitoring system
  // - Email: Alert ops team

  // For now, just ensure it's logged prominently
}

/**
 * Manual trigger for cost snapshot job (for testing/admin)
 * Usage: POST /api/admin/trigger-cost-snapshot
 */
export async function triggerCostSnapshotJobManually(supabase: SupabaseClient): Promise<void> {
  console.log('[NightlyCostSnapshot] Manual trigger received');
  await runNightlyCostSnapshotJob(supabase);
}

/**
 * Get job status (for monitoring)
 * Returns last execution time and next scheduled time
 */
export function getCostSnapshotJobStatus(): {
  schedule: string;
  lastExecution?: Date;
  nextExecution?: Date;
  status: 'scheduled' | 'running' | 'failed';
} {
  const job = schedule.scheduledJobs[COST_JOB_SCHEDULE] as any;

  return {
    schedule: COST_JOB_SCHEDULE,
    lastExecution: job?.lastInvocation ? new Date(job.lastInvocation()) : undefined,
    nextExecution: job?.nextInvocation(),
    status: job ? 'scheduled' : 'failed',
  };
}
