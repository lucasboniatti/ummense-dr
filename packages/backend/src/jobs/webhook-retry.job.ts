import { webhookDeliveryService } from '../services/webhook-delivery.service';

/**
 * Webhook Retry Job
 * Scheduled background job that processes pending webhook deliveries
 * Runs every 60 seconds to check for deliveries that are ready for retry
 */
export class WebhookRetryJob {
  private static readonly INTERVAL_MS = 60000; // 60 seconds
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the webhook retry job
   */
  static start(): void {
    if (WebhookRetryJob.intervalId) {
      console.warn('[WEBHOOK-JOB] Job already running');
      return;
    }

    console.log('[WEBHOOK-JOB] Starting webhook retry job (interval: 60 seconds)');

    WebhookRetryJob.intervalId = setInterval(async () => {
      try {
        const startTime = Date.now();
        const processedCount = await webhookDeliveryService.processRetryQueue();
        const duration = Date.now() - startTime;

        if (processedCount > 0) {
          console.log(
            `[WEBHOOK-JOB] Processed ${processedCount} pending deliveries in ${duration}ms`
          );
        }
      } catch (error) {
        console.error('[WEBHOOK-JOB] Error processing retry queue:', error);
      }
    }, WebhookRetryJob.INTERVAL_MS);
  }

  /**
   * Stop the webhook retry job
   */
  static stop(): void {
    if (WebhookRetryJob.intervalId) {
      clearInterval(WebhookRetryJob.intervalId);
      WebhookRetryJob.intervalId = null;
      console.log('[WEBHOOK-JOB] Webhook retry job stopped');
    }
  }

  /**
   * Check if job is running
   */
  static isRunning(): boolean {
    return WebhookRetryJob.intervalId !== null;
  }
}

// Auto-start the job when module is imported
if (process.env.NODE_ENV !== 'test') {
  WebhookRetryJob.start();
}

export const webhookRetryJob = WebhookRetryJob;
