/**
 * WebhookDeliveryService - Webhook delivery with exponential backoff retry logic
 * Story 3.2: Webhook Reliability & Retry Logic
 */

import { v4 as uuidv4 } from 'uuid';
import { generateSignature, buildWebhookHeaders } from './signature.service';

export interface WebhookConfig {
  url: string;
  secret: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  automationId: string;
  webhookId: string;
  executionId: string;
  attemptNumber: number;
  status: 'pending' | 'success' | 'failed' | 'dlq';
  httpStatusCode?: number;
  errorMessage?: string;
  errorContext?: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  responseBody?: string;
  durationMs?: number;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Exponential backoff retry intervals in seconds: 1s, 5s, 30s, 5m, 30m
 */
const BACKOFF_INTERVALS = [1, 5, 30, 300, 1800];

/**
 * WebhookDeliveryService - Manages webhook delivery with retry logic
 */
export class WebhookDeliveryService {
  /**
   * Send webhook delivery
   * Returns immediately (non-blocking) - actual delivery happens in background
   */
  async sendWebhook(
    automationId: string,
    executionId: string,
    webhook: WebhookConfig,
    payload: Record<string, unknown>,
    db: any // Database connection
  ): Promise<WebhookDeliveryRecord> {
    const webhookId = webhook.url;
    const signature = generateSignature(payload, webhook.secret);
    const deliveryId = uuidv4();
    const now = new Date().toISOString();

    // Create delivery record in 'pending' state
    const delivery: WebhookDeliveryRecord = {
      id: deliveryId,
      automationId,
      webhookId,
      executionId,
      attemptNumber: 1,
      status: 'pending',
      payload,
      signature,
      createdAt: now,
      updatedAt: now
    };

    // Insert into database (async, non-blocking)
    db.insert('webhook_deliveries')
      .values(delivery)
      .catch((error: Error) => {
        console.error(
          `Failed to insert webhook delivery record for ${webhookId}:`,
          error
        );
      });

    // Schedule immediate retry (background task will pick it up)
    // Don't await - return immediately
    return delivery;
  }

  /**
   * Attempt actual webhook delivery via HTTP
   * Called by retry processor
   */
  async attemptDelivery(
    delivery: WebhookDeliveryRecord
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();

    try {
      const response = await fetch(delivery.webhookId, {
        method: 'POST',
        headers: buildWebhookHeaders(delivery.signature),
        body: JSON.stringify(delivery.payload),
        timeout: 30000
      });

      const durationMs = Date.now() - startTime;

      if (response.ok) {
        // Success
        return { success: true };
      } else {
        // HTTP error
        const responseBody = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseBody.substring(0, 10000)}`
        };
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  getNextRetryTime(attemptNumber: number): Date {
    if (attemptNumber >= BACKOFF_INTERVALS.length) {
      throw new Error('Max retry attempts reached');
    }

    const delaySeconds = BACKOFF_INTERVALS[attemptNumber];
    const nextRetryTime = new Date();
    nextRetryTime.setSeconds(nextRetryTime.getSeconds() + delaySeconds);

    return nextRetryTime;
  }

  /**
   * Move delivery to Dead Letter Queue after max retries
   */
  async moveToDLQ(
    delivery: WebhookDeliveryRecord,
    db: any
  ): Promise<void> {
    const dlqId = uuidv4();
    const now = new Date().toISOString();

    // Create DLQ record
    const dlqItem = {
      id: dlqId,
      automationId: delivery.automationId,
      webhookDeliveryId: delivery.id,
      webhookUrl: delivery.webhookId,
      payload: delivery.payload,
      retryCount: delivery.attemptNumber,
      lastError: delivery.errorMessage,
      lastErrorAt: now,
      clearedAt: null,
      createdAt: now
    };

    // Update delivery status to 'dlq'
    await db('webhook_deliveries')
      .where('id', delivery.id)
      .update({
        status: 'dlq',
        updatedAt: now
      });

    // Insert DLQ record
    await db('dlq_items').insert(dlqItem);
  }
}
