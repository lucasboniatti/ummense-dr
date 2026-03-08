/**
 * Webhook Retry Service
 * Calculates exponential backoff delays for webhook delivery retries
 * Strategy: 2^n seconds, max 300 seconds (5 minutes), max 5 attempts
 */
export class WebhookRetryService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly MAX_BACKOFF_SECONDS = 300; // 5 minutes
  private readonly BASE_BACKOFF_SECONDS = 2;

  /**
   * Calculate delay for next retry attempt
   * @param attemptNumber Current attempt number (1-indexed)
   * @returns Delay in seconds for next retry
   */
  calculateBackoffSeconds(attemptNumber: number): number {
    if (attemptNumber < 1 || attemptNumber >= this.MAX_ATTEMPTS) {
      throw new Error(`Invalid attempt number: ${attemptNumber}`);
    }

    // Exponential backoff: 2^n
    const backoffSeconds = Math.pow(this.BASE_BACKOFF_SECONDS, attemptNumber);

    // Cap at max backoff
    return Math.min(backoffSeconds, this.MAX_BACKOFF_SECONDS);
  }

  /**
   * Calculate next retry timestamp
   * @param attemptNumber Current attempt number (1-indexed)
   * @param baseTime Time to calculate from (default: now)
   * @returns Date object for next retry
   */
  calculateNextRetryTime(attemptNumber: number, baseTime: Date = new Date()): Date {
    const backoffSeconds = this.calculateBackoffSeconds(attemptNumber);
    const nextRetry = new Date(baseTime);
    nextRetry.setSeconds(nextRetry.getSeconds() + backoffSeconds);
    return nextRetry;
  }

  /**
   * Get retry schedule for all attempts
   * @returns Array of backoff durations for each attempt
   */
  getRetrySchedule(): Array<{ attempt: number; delaySeconds: number; description: string }> {
    const schedule = [];

    // Attempt 1 is immediate (no delay)
    schedule.push({
      attempt: 1,
      delaySeconds: 0,
      description: 'Immediate'
    });

    // Attempts 2-5 use the backoff for the previous failure count.
    for (let attempt = 2; attempt <= this.MAX_ATTEMPTS; attempt++) {
      const delaySeconds = this.calculateBackoffSeconds(attempt - 1);
      schedule.push({
        attempt,
        delaySeconds,
        description: `${delaySeconds}s (2^${attempt - 1})`
      });
    }

    return schedule;
  }

  /**
   * Calculate total time span for all 5 attempts
   * @returns Total seconds from first attempt to final attempt
   */
  getTotalRetryTimeSpan(): number {
    let totalSeconds = 0;

    for (let attempt = 1; attempt < this.MAX_ATTEMPTS; attempt++) {
      totalSeconds += this.calculateBackoffSeconds(attempt);
    }

    return totalSeconds;
  }

  /**
   * Check if retry should be attempted
   * @param attemptCount Number of attempts already made
   * @param lastFailureTime Time of last failure
   * @param currentTime Current time
   * @returns true if should retry
   */
  shouldRetry(attemptCount: number, lastFailureTime: Date, currentTime: Date = new Date()): boolean {
    // Max attempts reached
    if (attemptCount >= this.MAX_ATTEMPTS) {
      return false;
    }

    // Calculate when next retry should happen
    const nextAttempt = attemptCount + 1;
    const nextRetryTime = this.calculateNextRetryTime(attemptCount, lastFailureTime);

    // Check if enough time has passed
    return currentTime.getTime() >= nextRetryTime.getTime();
  }

  /**
   * Get max attempts allowed
   */
  getMaxAttempts(): number {
    return this.MAX_ATTEMPTS;
  }

  /**
   * Format retry schedule for human readability
   */
  formatRetrySchedule(): string {
    const schedule = this.getRetrySchedule();
    const lines = schedule.map(s => `  Attempt ${s.attempt}: ${s.description}`);
    return lines.join('\n');
  }
}

export const webhookRetryService = new WebhookRetryService();
