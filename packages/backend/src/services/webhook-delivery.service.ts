import { createClient } from '@supabase/supabase-js';
import { ssrfValidatorService } from './ssrf-validator.service';
import { idempotencyKeyService } from './idempotency-key.service';
import { webhookRetryService } from './webhook-retry.service';

interface WebhookPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, any>;
  metadata: {
    attempt: number;
    max_attempts: number;
  };
}

/**
 * Webhook Delivery Service
 * Handles reliable webhook delivery with retries, SSRF protection, and idempotency
 */
export class WebhookDeliveryService {
  private supabase;
  private readonly HTTP_TIMEOUT_MS = 30000; // 30 seconds

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Enqueue webhook delivery for an event
   * @param webhookId Webhook identifier
   * @param eventId Event identifier
   * @param eventType Event type (e.g., "task:created")
   * @param eventData Event payload
   * @returns Delivery record ID
   */
  async enqueueWebhookDelivery(
    webhookId: string,
    eventId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<string> {
    // Fetch webhook details
    const { data: webhook, error: webhookError } = await this.supabase
      .from('webhooks')
      .select('url, secret')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    // Validate URL upfront (SSRF protection)
    await ssrfValidatorService.validateWebhookUrl(webhook.url);

    // Create idempotency key
    const idempotencyKey = idempotencyKeyService.generateKey(webhookId, eventId, eventType);

    // Create delivery record
    const { data: delivery, error: deliveryError } = await this.supabase
      .from('webhook_deliveries')
      .insert([
        {
          webhook_id: webhookId,
          event_id: eventId,
          idempotency_key: idempotencyKey,
          status: 'pending',
          attempt_count: 0,
          next_retry_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('id')
      .single();

    if (deliveryError || !delivery) {
      throw new Error(`Failed to create delivery record: ${deliveryError?.message}`);
    }

    // Attempt immediate delivery
    await this.deliverWebhook(delivery.id, webhookId, eventId, eventType, eventData, webhook);

    return delivery.id;
  }

  /**
   * Deliver webhook to endpoint
   * @param deliveryId Delivery record ID
   * @param webhookId Webhook identifier
   * @param eventId Event identifier
   * @param eventType Event type
   * @param eventData Event payload
   * @param webhook Webhook record from database
   */
  private async deliverWebhook(
    deliveryId: string,
    webhookId: string,
    eventId: string,
    eventType: string,
    eventData: Record<string, any>,
    webhook: { url: string; secret?: string }
  ): Promise<void> {
    const startTime = Date.now();
    const payload: WebhookPayload = {
      event_id: eventId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
      metadata: {
        attempt: 1,
        max_attempts: 5
      }
    };

    const payloadJson = JSON.stringify(payload);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Event-Type': eventType,
        'X-Event-ID': eventId,
        'X-Idempotency-Key': idempotencyKeyService.generateKey(webhookId, eventId, eventType)
      };

      // Add signature if webhook has secret
      if (webhook.secret) {
        const signature = idempotencyKeyService.generateSignature(payloadJson, webhook.secret);
        headers['X-Signature'] = `sha256=${signature}`;
      }

      // Make HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HTTP_TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadJson,
        signal: controller.signal as any
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      // Update delivery record
      if (response.ok) {
        await this.updateDeliverySuccess(deliveryId, response.status, responseBody, duration);
      } else {
        await this.updateDeliveryFailure(
          deliveryId,
          response.status,
          responseBody,
          duration,
          1
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Timeout or network error
      await this.updateDeliveryFailure(deliveryId, null, errorMessage, duration, 1);
    }
  }

  /**
   * Update delivery record on success
   */
  private async updateDeliverySuccess(
    deliveryId: string,
    statusCode: number,
    responseBody: string,
    duration: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_deliveries')
      .update({
        status: 'success',
        response_status_code: statusCode,
        response_body: responseBody,
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId);

    if (error) {
      console.error(`[WEBHOOK] Failed to update delivery success:`, error);
    }

    console.log(`[WEBHOOK] Delivery ${deliveryId} succeeded (${statusCode}, ${duration}ms)`);
  }

  /**
   * Update delivery record on failure
   */
  private async updateDeliveryFailure(
    deliveryId: string,
    statusCode: number | null,
    errorMessage: string,
    duration: number,
    attemptCount: number
  ): Promise<void> {
    const nextAttemptCount = attemptCount + 1;

    // Check if we should retry
    if (nextAttemptCount >= webhookRetryService.getMaxAttempts()) {
      // Move to dead letter queue
      const { error } = await this.supabase
        .from('webhook_deliveries')
        .update({
          status: 'dead_lettered',
          attempt_count: nextAttemptCount,
          response_status_code: statusCode,
          response_body: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) {
        console.error(`[WEBHOOK] Failed to update delivery dead letter:`, error);
      }

      console.log(
        `[WEBHOOK] Delivery ${deliveryId} moved to dead letter queue after ${nextAttemptCount} attempts`
      );
    } else {
      // Schedule retry
      const nextRetryTime = webhookRetryService.calculateNextRetryTime(attemptCount);

      const { error } = await this.supabase
        .from('webhook_deliveries')
        .update({
          status: 'pending',
          attempt_count: nextAttemptCount,
          response_status_code: statusCode,
          response_body: errorMessage,
          next_retry_at: nextRetryTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) {
        console.error(`[WEBHOOK] Failed to update delivery retry:`, error);
      }

      console.log(
        `[WEBHOOK] Delivery ${deliveryId} scheduled for retry at ${nextRetryTime.toISOString()}`
      );
    }
  }

  /**
   * Process pending webhook deliveries (called by retry job)
   * @returns Number of deliveries processed
   */
  async processRetryQueue(): Promise<number> {
    const { data: deliveries, error } = await this.supabase
      .from('webhook_deliveries')
      .select(`
        id,
        webhook_id,
        event_id,
        status,
        attempt_count,
        next_retry_at,
        webhooks!webhook_id(url, secret),
        events!event_id(type, data)
      `)
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .limit(100); // Process up to 100 at a time

    if (error) {
      console.error(`[WEBHOOK] Failed to fetch pending deliveries:`, error);
      return 0;
    }

    if (!deliveries || deliveries.length === 0) {
      return 0;
    }

    // Process each delivery
    for (const delivery of deliveries) {
      try {
        const webhook = delivery.webhooks as any;
        const event = delivery.events as any;

        if (!webhook || !event) {
          console.warn(`[WEBHOOK] Missing webhook or event for delivery ${delivery.id}`);
          continue;
        }

        // Retry delivery
        await this.deliverWebhook(
          delivery.id,
          delivery.webhook_id,
          delivery.event_id,
          event.type,
          event.data,
          webhook
        );
      } catch (error) {
        console.error(`[WEBHOOK] Error processing delivery ${delivery.id}:`, error);
      }
    }

    return deliveries.length;
  }

  /**
   * Get delivery metrics
   */
  async getDeliveryMetrics(): Promise<{
    totalDeliveries: number;
    successRate: number;
    averageDeliveryTime: number;
    deadLetteredCount: number;
  }> {
    // Query metrics from automation_logs (assuming webhook deliveries are logged there)
    const { data: logs, error } = await this.supabase
      .from('automation_logs')
      .select('execution_status, duration_ms')
      .like('rule_id', 'webhook-%'); // Filter for webhook-related logs

    if (error || !logs) {
      return {
        totalDeliveries: 0,
        successRate: 0,
        averageDeliveryTime: 0,
        deadLetteredCount: 0
      };
    }

    const successCount = logs.filter(l => l.execution_status === 'success').length;
    const totalDeliveries = logs.length;
    const successRate = totalDeliveries > 0 ? (successCount / totalDeliveries) * 100 : 0;
    const averageDeliveryTime =
      totalDeliveries > 0
        ? logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / totalDeliveries
        : 0;

    // Get dead-lettered count
    const { count: deadLetteredCount, error: deadLetterError } = await this.supabase
      .from('webhook_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead_lettered');

    return {
      totalDeliveries,
      successRate: Math.round(successRate * 100) / 100,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      deadLetteredCount: deadLetteredCount || 0
    };
  }
}

export const webhookDeliveryService = new WebhookDeliveryService();
