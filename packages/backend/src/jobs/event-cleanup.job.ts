import { createClient } from '@supabase/supabase-js';

/**
 * Event Cleanup Job
 * Runs daily to soft-delete events older than 90 days
 * Uses soft delete (deleted_at) for audit trail retention
 */
export class EventCleanupJob {
  private supabase;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Start cleanup job with configurable interval
   * @param intervalHours Run interval in hours (default: 24)
   */
  start(intervalHours: number = 24): void {
    console.log(`[EVENT CLEANUP] Starting job - runs every ${intervalHours} hours`);

    // Run immediately on start
    this.cleanup();

    // Then run at interval
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, intervalHours * 60 * 60 * 1000);
  }

  /**
   * Stop cleanup job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('[EVENT CLEANUP] Job stopped');
    }
  }

  /**
   * Execute cleanup - soft delete events older than 90 days
   */
  private async cleanup(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from('event_logs')
        .update({ deleted_at: new Date().toISOString() })
        .lt('created_at', ninetyDaysAgo)
        .is('deleted_at', null) // Only clean events not already deleted
        .select('count');

      if (error) {
        console.error('[EVENT CLEANUP] Error during cleanup:', error);
        return;
      }

      console.log(`[EVENT CLEANUP] Successfully cleaned up events`, {
        timestamp: new Date().toISOString(),
        cutoffDate: ninetyDaysAgo,
        affectedRows: data?.length || 0
      });
    } catch (error) {
      console.error('[EVENT CLEANUP] Unexpected error:', error);
    }
  }
}

// Singleton instance
export const eventCleanupJob = new EventCleanupJob();
