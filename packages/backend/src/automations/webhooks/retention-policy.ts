/**
 * WebhookRetentionPolicy - Automated cleanup of old webhook delivery records
 * Story 3.2: Webhook Reliability & Retry Logic
 * Runs nightly to delete records older than retention window (default: 90 days)
 */

/**
 * Webhook retention policy configuration
 */
export interface RetentionPolicyConfig {
  retentionDays: number; // Number of days to keep records (default: 90)
  maxDaysAllowed: number; // Maximum allowed retention (default: 730 = 2 years)
  cleanupDayOfWeek: number; // Day of week to run cleanup (0=Sunday, 1=Monday, etc.)
  cleanupHour: number; // Hour of day to run cleanup (0-23, UTC)
}

/**
 * Default retention policy configuration
 */
export const DEFAULT_RETENTION_POLICY: RetentionPolicyConfig = {
  retentionDays: 90,
  maxDaysAllowed: 730,
  cleanupDayOfWeek: 0, // Sunday
  cleanupHour: 2 // 2 AM UTC
};

/**
 * Retention policy executor
 */
export class WebhookRetentionPolicy {
  private config: RetentionPolicyConfig;
  private db: any; // Database connection

  constructor(config: Partial<RetentionPolicyConfig> = {}, db?: any) {
    this.config = { ...DEFAULT_RETENTION_POLICY, ...config };
    this.db = db;
  }

  /**
   * Execute retention policy cleanup
   * Delete webhook_deliveries older than retention window
   */
  async executeCleanup(): Promise<{
    deletedCount: number;
    deletedBytes?: number;
    executionTime: number;
    oldestKeptDate: Date;
  }> {
    const startTime = Date.now();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      // Get size of records before deletion (for reporting)
      const sizeInfo = await this.getApproximateSize(cutoffDate);

      // Delete webhook_deliveries older than cutoff
      const deleteResult = await this.db('webhook_deliveries')
        .where('created_at', '<', cutoffDate.toISOString())
        .del();

      const executionTime = Date.now() - startTime;

      console.log(
        `[WebhookRetention] Deleted ${deleteResult} records older than ${this.config.retentionDays} days (${executionTime}ms)`
      );

      return {
        deletedCount: deleteResult,
        deletedBytes: sizeInfo,
        executionTime,
        oldestKeptDate: cutoffDate
      };
    } catch (error) {
      console.error('[WebhookRetention] Cleanup failed:', error);
      throw new Error(
        `Retention policy cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get approximate size of records that will be deleted
   * (Not exact, estimation for reporting)
   */
  private async getApproximateSize(cutoffDate: Date): Promise<number> {
    try {
      const result = await this.db('webhook_deliveries')
        .select(this.db.raw('SUM(pg_column_size(webhook_deliveries.*)) as total_bytes'))
        .where('created_at', '<', cutoffDate.toISOString())
        .first();

      return result?.total_bytes || 0;
    } catch {
      // If query fails, return 0 (estimation not critical)
      return 0;
    }
  }

  /**
   * Should cleanup run at this time?
   * Based on configured day and hour
   */
  shouldRunNow(): boolean {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const hour = now.getUTCHours();

    const dayMatches = dayOfWeek === this.config.cleanupDayOfWeek;
    const hourMatches = hour === this.config.cleanupHour;

    return dayMatches && hourMatches;
  }

  /**
   * Get next scheduled cleanup time
   */
  getNextScheduledTime(): Date {
    const now = new Date();
    const next = new Date(now);

    // Set to configured day of week and hour
    next.setUTCHours(this.config.cleanupHour, 0, 0, 0);

    // Calculate days until target day of week
    const currentDay = next.getUTCDay();
    const daysUntilTarget = (this.config.cleanupDayOfWeek - currentDay + 7) % 7;

    if (daysUntilTarget === 0 && next <= now) {
      // Target day is today but time has passed, schedule for next week
      next.setDate(next.getDate() + 7);
    } else {
      // Schedule for next occurrence of target day
      next.setDate(next.getDate() + daysUntilTarget);
    }

    return next;
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.retentionDays < 7) {
      errors.push('retentionDays must be at least 7 days');
    }

    if (this.config.retentionDays > this.config.maxDaysAllowed) {
      errors.push(
        `retentionDays (${this.config.retentionDays}) exceeds maxDaysAllowed (${this.config.maxDaysAllowed})`
      );
    }

    if (this.config.cleanupDayOfWeek < 0 || this.config.cleanupDayOfWeek > 6) {
      errors.push('cleanupDayOfWeek must be 0-6');
    }

    if (this.config.cleanupHour < 0 || this.config.cleanupHour > 23) {
      errors.push('cleanupHour must be 0-23');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RetentionPolicyConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RetentionPolicyConfig>): void {
    const updated = { ...this.config, ...newConfig };
    const validation = new WebhookRetentionPolicy(updated, this.db).validateConfig();

    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    this.config = updated;
  }
}

/**
 * Initialize retention policy scheduler
 * Runs cleanup at scheduled time
 */
export function initializeRetentionPolicy(db: any, config?: Partial<RetentionPolicyConfig>): {
  policy: WebhookRetentionPolicy;
  timer: NodeJS.Timer;
  nextRun: Date;
} {
  const policy = new WebhookRetentionPolicy(config, db);

  // Validate configuration on startup
  const validation = policy.validateConfig();
  if (!validation.valid) {
    throw new Error(`Invalid retention policy configuration: ${validation.errors.join(', ')}`);
  }

  console.log(
    `[WebhookRetention] Initialized - Retention period: ${policy.getConfig().retentionDays} days`
  );
  console.log(`[WebhookRetention] Next cleanup scheduled for: ${policy.getNextScheduledTime().toISOString()}`);

  // Check every hour if cleanup should run
  const timer = setInterval(async () => {
    if (policy.shouldRunNow()) {
      try {
        const result = await policy.executeCleanup();
        console.log(
          `[WebhookRetention] Cleanup completed: deleted ${result.deletedCount} records, took ${result.executionTime}ms`
        );
      } catch (error) {
        console.error('[WebhookRetention] Scheduled cleanup failed:', error);
      }
    }
  }, 3600000); // Check every hour

  return {
    policy,
    timer,
    nextRun: policy.getNextScheduledTime()
  };
}
