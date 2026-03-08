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

interface QueueWebhookDeliveryParams {
  webhookId?: string;
  webhookUrl?: string;
  eventId: string;
  eventType: string;
  eventData: Record<string, any>;
  dispatchImmediately?: boolean;
}

interface ResolvedWebhookTarget {
  id: string;
  url: string;
  secret?: string;
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
    return this.queueWebhookDelivery({
      webhookId,
      eventId,
      eventType,
      eventData,
      dispatchImmediately: true,
    });
  }

  /**
   * Queue a webhook delivery without forcing the HTTP side effect to happen inline.
   * This is the path used by the rule engine to preserve all-or-nothing semantics.
   */
  async queueWebhookDelivery(params: QueueWebhookDeliveryParams): Promise<string> {
    const webhook = await this.resolveWebhookTarget(params);

    await ssrfValidatorService.validateWebhookUrl(webhook.url);

    const payload = this.buildPayload(params.eventId, params.eventType, params.eventData, 1);
    const createdAt = new Date().toISOString();
    const idempotencyKey = idempotencyKeyService.generateKey(
      webhook.id,
      params.eventId,
      params.eventType
    );

    const { data: delivery, error: deliveryError } = await this.insertDeliveryRecord({
      webhook_id: webhook.id,
      event_id: params.eventId,
      event_type: params.eventType,
      idempotency_key: idempotencyKey,
      status: 'pending',
      attempt_count: 0,
      next_retry_at: createdAt,
      created_at: createdAt,
      updated_at: createdAt,
      request_body: payload,
      payload,
    });

    if (deliveryError || !delivery) {
      throw new Error(`Failed to create delivery record: ${deliveryError?.message}`);
    }

    if (params.dispatchImmediately !== false) {
      await this.processQueuedDelivery(delivery.id);
    }

    return delivery.id;
  }

  async processQueuedDelivery(deliveryId: string): Promise<void> {
    const { data: delivery, error } = await this.supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (error || !delivery) {
      throw new Error(`Webhook delivery not found: ${deliveryId}`);
    }

    const { data: webhook, error: webhookError } = await this.supabase
      .from('webhooks')
      .select('id, url, secret')
      .eq('id', delivery.webhook_id)
      .single();

    if (webhookError || !webhook) {
      throw new Error(`Webhook not found: ${delivery.webhook_id}`);
    }

    const eventType =
      delivery.event_type ??
      delivery.request_body?.event_type ??
      delivery.payload?.event_type;
    const eventData =
      delivery.request_body?.data ??
      delivery.payload?.data ??
      delivery.payload ??
      {};

    if (!eventType) {
      throw new Error(`Webhook delivery ${deliveryId} is missing event_type metadata`);
    }

    await this.deliverWebhook(
      delivery.id,
      delivery.webhook_id,
      delivery.event_id,
      eventType,
      eventData,
      webhook,
      delivery.attempt_count ?? 0
    );
  }

  async deleteQueuedDelivery(deliveryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_deliveries')
      .delete()
      .eq('id', deliveryId);

    if (error) {
      throw new Error(`Failed to delete queued delivery ${deliveryId}: ${error.message}`);
    }
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
    webhook: { url: string; secret?: string },
    attemptCount: number
  ): Promise<void> {
    const startTime = Date.now();
    const payload = this.buildPayload(
      eventId,
      eventType,
      eventData,
      Math.max(1, attemptCount + 1)
    );

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
        await this.updateDeliverySuccess(
          deliveryId,
          response.status,
          responseBody,
          duration,
          attemptCount
        );
      } else {
        await this.updateDeliveryFailure(
          deliveryId,
          response.status,
          responseBody,
          duration,
          attemptCount
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Timeout or network error
      await this.updateDeliveryFailure(deliveryId, null, errorMessage, duration, attemptCount);
    }
  }

  /**
   * Update delivery record on success
   */
  private async updateDeliverySuccess(
    deliveryId: string,
    statusCode: number,
    responseBody: string,
    duration: number,
    attemptCount: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_deliveries')
      .update({
        status: 'success',
        attempt_count: attemptCount + 1,
        response_status_code: statusCode,
        response_body: responseBody,
        delivered_at: new Date().toISOString(),
        next_retry_at: null,
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
      .select('*')
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
        await this.processQueuedDelivery(delivery.id);
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

  private async resolveWebhookTarget(
    params: Pick<QueueWebhookDeliveryParams, 'webhookId' | 'webhookUrl'>
  ): Promise<ResolvedWebhookTarget> {
    if (!params.webhookId && !params.webhookUrl) {
      throw new Error('send_webhook requires webhookId or webhookUrl');
    }

    if (params.webhookId) {
      const { data: webhook, error } = await this.supabase
        .from('webhooks')
        .select('id, url, secret')
        .eq('id', params.webhookId)
        .single();

      if (error || !webhook) {
        throw new Error(`Webhook not found: ${params.webhookId}`);
      }

      return webhook as ResolvedWebhookTarget;
    }

    const { data: webhook, error } = await this.supabase
      .from('webhooks')
      .select('id, url, secret')
      .eq('url', params.webhookUrl)
      .maybeSingle();

    if (error || !webhook) {
      throw new Error(
        `Webhook must be registered before rule-based delivery: ${params.webhookUrl}`
      );
    }

    return webhook as ResolvedWebhookTarget;
  }

  private buildPayload(
    eventId: string,
    eventType: string,
    eventData: Record<string, any>,
    attempt: number
  ): WebhookPayload {
    return {
      event_id: eventId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
      metadata: {
        attempt,
        max_attempts: webhookRetryService.getMaxAttempts()
      }
    };
  }

  private async insertDeliveryRecord(record: Record<string, any>) {
    const variants = [
      record,
      { ...record, payload: undefined },
      { ...record, request_body: undefined },
      {
        webhook_id: record.webhook_id,
        event_id: record.event_id,
        event_type: record.event_type,
        idempotency_key: record.idempotency_key,
        status: record.status,
        attempt_count: record.attempt_count,
        next_retry_at: record.next_retry_at,
        created_at: record.created_at,
        updated_at: record.updated_at,
      },
    ].map((candidate) =>
      Object.fromEntries(
        Object.entries(candidate).filter(([, value]) => value !== undefined)
      )
    );

    let lastError: any = null;
    for (const candidate of variants) {
      const result = await this.supabase
        .from('webhook_deliveries')
        .insert([candidate])
        .select('id')
        .single();

      if (!result.error) {
        return result;
      }

      lastError = result.error;
    }

    return { data: null, error: lastError };
  }
}

export const webhookDeliveryService = new WebhookDeliveryService();
