/**
 * RetryProcessor - Background job for webhook retry processing
 * Story 3.2: Webhook Reliability & Retry Logic
 * Runs every 60 seconds to process pending retries with exponential backoff
 */

import { WebhookDeliveryService, WebhookDeliveryRecord } from './webhook-delivery.service';

/**
 * Process pending webhook retries
 * Called every 60 seconds by a scheduled task
 */
export async function processWebhookRetries(db: any): Promise<{
  processed: number;
  succeeded: number;
  rescheduled: number;
  movedToDLQ: number;
}> {
  const stats = {
    processed: 0,
    succeeded: 0,
    rescheduled: 0,
    movedToDLQ: 0
  };

  const deliveryService = new WebhookDeliveryService();

  try {
    // Find all pending retries that are ready to retry
    const pendingRetries = await db
      .select('*')
      .from('webhook_deliveries')
      .where('status', 'pending')
      .andWhere('next_retry_at', '<=', new Date())
      .orderBy('created_at', 'asc')
      .limit(100); // Process max 100 per run

    stats.processed = pendingRetries.length;

    for (const delivery of pendingRetries) {
      try {
        // Attempt delivery
        const result = await deliveryService.attemptDelivery(delivery);
        const now = new Date().toISOString();
        const durationMs = Date.now() - new Date(delivery.createdAt).getTime();

        if (result.success) {
          // Success - mark as completed
          await db('webhook_deliveries')
            .where('id', delivery.id)
            .update({
              status: 'success',
              updatedAt: now
            });

          // Remove from DLQ if it was there
          await db('dlq_items')
            .where('webhook_delivery_id', delivery.id)
            .del();

          stats.succeeded++;
        } else {
          // Failure - reschedule or move to DLQ
          if (delivery.attemptNumber < 5) {
            // Reschedule for next retry
            const nextRetryTime = deliveryService.getNextRetryTime(
              delivery.attemptNumber
            );

            await db('webhook_deliveries')
              .where('id', delivery.id)
              .update({
                status: 'pending',
                attemptNumber: delivery.attemptNumber + 1,
                errorMessage: result.error,
                errorContext: { message: result.error },
                nextRetryAt: nextRetryTime,
                updatedAt: now,
                durationMs
              });

            stats.rescheduled++;
          } else {
            // Max retries reached - move to DLQ
            const dlqItem = {
              id: crypto.randomUUID?.() || generateUUID(),
              automationId: delivery.automationId,
              webhookDeliveryId: delivery.id,
              webhookUrl: delivery.webhookId,
              payload: delivery.payload,
              retryCount: delivery.attemptNumber,
              lastError: result.error,
              lastErrorAt: now,
              clearedAt: null,
              createdAt: now
            };

            await db('webhook_deliveries')
              .where('id', delivery.id)
              .update({
                status: 'dlq',
                errorMessage: result.error,
                updatedAt: now
              });

            await db('dlq_items').insert(dlqItem);

            stats.movedToDLQ++;
          }
        }
      } catch (error) {
        console.error(
          `Error processing webhook retry for ${delivery.webhookId}:`,
          error
        );
        // Continue with next delivery
      }
    }

    return stats;
  } catch (error) {
    console.error('Error in webhook retry processor:', error);
    throw error;
  }
}

/**
 * Fallback UUID generation for older Node versions
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Initialize retry processor - call this once on app startup
 */
export function initializeRetryProcessor(db: any, intervalSeconds: number = 60): NodeJS.Timer {
  console.log(`Starting webhook retry processor (interval: ${intervalSeconds}s)`);

  return setInterval(async () => {
    try {
      const stats = await processWebhookRetries(db);
      if (stats.processed > 0) {
        console.log(
          `Webhook retry processor: processed=${stats.processed}, succeeded=${stats.succeeded}, rescheduled=${stats.rescheduled}, dlq=${stats.movedToDLQ}`
        );
      }
    } catch (error) {
      console.error('Webhook retry processor error:', error);
    }
  }, intervalSeconds * 1000);
}
