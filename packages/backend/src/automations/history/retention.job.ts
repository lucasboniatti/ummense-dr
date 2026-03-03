import schedule from 'node-schedule';
import { ExecutionHistoryService } from './history.service';

/**
 * Retention cleanup job
 * Runs nightly at 2 AM UTC
 * Deletes execution histories older than user's retention policy
 */
export function startRetentionCleanupJob(historyService: ExecutionHistoryService) {
  // Schedule at 2 AM UTC every day
  const job = schedule.scheduleJob('0 2 * * *', async () => {
    try {
      console.log('[Retention Job] Starting cleanup at', new Date().toISOString());

      await historyService.cleanupOldExecutions();

      console.log('[Retention Job] Cleanup completed at', new Date().toISOString());
    } catch (error) {
      console.error('[Retention Job] Error during cleanup:', error);
      // Continue running even if cleanup fails
    }
  });

  console.log('[Retention Job] Scheduled for 2 AM UTC daily');

  return job;
}

/**
 * Stop retention cleanup job (for testing or shutdown)
 */
export function stopRetentionCleanupJob(job: schedule.Job) {
  job.cancel();
  console.log('[Retention Job] Cancelled');
}
