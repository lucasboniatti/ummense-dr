import { supabase } from '../lib/supabase';
import { AppError } from '../utils/errors';
import { webhookDeliveryService } from './webhook-delivery.service';
import { ssrfValidatorService } from './ssrf-validator.service';
import { idempotencyKeyService } from './idempotency-key.service';
import crypto from 'crypto';

interface CreateWebhookPayload {
  url: string;
  description?: string;
  enabled?: boolean;
}

interface UpdateWebhookPayload {
  url?: string;
  description?: string;
  enabled?: boolean;
}

interface DeliveryHistoryFilter {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit: number;
  offset: number;
}

export const webhookService = {
  /**
   * List all webhooks for a user
   */
  async listWebhooks(userId: string) {
    const { data, error } = await supabase
      .from('webhooks')
      .select('id,url,description,enabled,created_at,api_key_preview')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((w) => ({
      id: w.id,
      url: w.url,
      description: w.description,
      enabled: w.enabled,
      apiKeyPreview: w.api_key_preview,
      createdAt: w.created_at,
      lastTriggeredAt: null,
      successRate: 0,
    }));
  },

  /**
   * Get webhook detail with recent deliveries
   */
  async getWebhookDetail(userId: string, webhookId: string) {
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (webhookError || !webhook) {
      return null;
    }

    // Get recent deliveries
    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      id: webhook.id,
      url: webhook.url,
      description: webhook.description,
      enabled: webhook.enabled,
      apiKeyPreview: webhook.api_key_preview,
      createdAt: webhook.created_at,
      recentDeliveries: deliveries || [],
    };
  },

  /**
   * Create a new webhook
   */
  async createWebhook(userId: string, payload: CreateWebhookPayload) {
    // Validate URL (SSRF protection)
    try {
      await ssrfValidatorService.validateWebhookUrl(payload.url);
    } catch (e) {
      throw new AppError(
        'Invalid webhook URL: ' + (e as Error).message,
        400
      );
    }

    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyPreview = `sk_${apiKey.slice(-4)}`;

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: userId,
        url: payload.url,
        description: payload.description,
        enabled: payload.enabled !== false,
        api_key_hash: apiKey,
        api_key_preview: apiKeyPreview,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      url: data.url,
      description: data.description,
      enabled: data.enabled,
      apiKey: apiKey, // Return full key ONLY on creation
      apiKeyPreview: apiKeyPreview,
      createdAt: data.created_at,
    };
  },

  /**
   * Update a webhook
   */
  async updateWebhook(
    userId: string,
    webhookId: string,
    payload: UpdateWebhookPayload
  ) {
    // Verify ownership
    const { data: existing } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return null;
    }

    // Validate URL if provided
    if (payload.url) {
      try {
        await ssrfValidatorService.validateWebhookUrl(payload.url);
      } catch (e) {
        throw new AppError(
          'Invalid webhook URL: ' + (e as Error).message,
          400
        );
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (payload.url) updateData.url = payload.url;
    if (payload.description !== undefined) {
      updateData.description = payload.description;
    }
    if (payload.enabled !== undefined) updateData.enabled = payload.enabled;

    const { data, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', webhookId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      url: data.url,
      description: data.description,
      enabled: data.enabled,
      apiKeyPreview: data.api_key_preview,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Soft delete webhook
   */
  async deleteWebhook(userId: string, webhookId: string) {
    const { data, error } = await supabase
      .from('webhooks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', webhookId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    return Boolean(data);
  },

  /**
   * Test webhook by sending immediately (bypass queue)
   */
  async testWebhook(
    userId: string,
    webhookId: string,
    eventType: string = 'task:created',
    customPayload?: any
  ) {
    // Get webhook
    const { data: webhook } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    // Generate test event ID
    const eventId = crypto.randomUUID();

    // Create test payload
    const payload = customPayload || this.generateSamplePayload(eventType);

    // Send immediately (not queued)
    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKeyService.generateKey(
            webhookId,
            eventId,
            eventType
          ),
          ...(webhook.api_key_secret && {
            'X-Signature': `sha256=${idempotencyKeyService.generateSignature(
              JSON.stringify(payload),
              webhook.api_key_secret
            )}`,
          }),
        },
        body: JSON.stringify({
          event_id: eventId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          data: payload.data || payload,
          metadata: {
            attempt: 1,
            max_attempts: 5,
            test: true,
          },
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const elapsed = Date.now() - startTime;
      const responseBody = await response.text();

      return {
        success: response.ok,
        statusCode: response.status,
        statusMessage: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        elapsed: elapsed,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;

      return {
        success: false,
        statusCode: 0,
        statusMessage: (error as Error).message,
        headers: {},
        body: `Error: ${(error as Error).message}`,
        elapsed: elapsed,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Get delivery history with filtering
   */
  async getDeliveryHistory(
    userId: string,
    webhookId: string,
    filters: DeliveryHistoryFilter
  ) {
    // Verify webhook ownership
    const { data: webhook } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', webhookId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    let query = supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId);

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply date range filter
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `event_id.ilike.%${filters.search}%,event_type.ilike.%${filters.search}%`
      );
    }

    // Apply pagination
    const { data: deliveries, error, count } = await query
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (error) throw error;

    return {
      deliveries: deliveries || [],
      total: count || 0,
      limit: filters.limit,
      offset: filters.offset,
    };
  },

  /**
   * Get delivery metrics for last 24 hours
   */
  async getDeliveryMetrics(userId: string, webhookId: string) {
    // Verify webhook ownership
    const { data: webhook } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', webhookId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('status, created_at')
      .eq('webhook_id', webhookId)
      .gte('created_at', oneDayAgo);

    // Calculate metrics
    const total = deliveries?.length || 0;
    const success = deliveries?.filter((d) => d.status === 'success').length || 0;
    const failed = deliveries?.filter((d) => d.status === 'failed').length || 0;
    const pending = deliveries?.filter((d) => d.status === 'pending').length || 0;
    const deadLettered =
      deliveries?.filter((d) => d.status === 'dead_lettered').length || 0;

    // Group by hour for graph
    const hourlyData: Record<string, { success: number; failed: number }> = {};
    (deliveries || []).forEach((d) => {
      const hour = new Date(d.created_at).toISOString().slice(0, 13);
      if (!hourlyData[hour]) {
        hourlyData[hour] = { success: 0, failed: 0 };
      }
      if (d.status === 'success') {
        hourlyData[hour].success++;
      } else if (d.status === 'failed' || d.status === 'dead_lettered') {
        hourlyData[hour].failed++;
      }
    });

    return {
      total,
      success,
      failed,
      pending,
      deadLettered,
      successRate: total > 0 ? (success / total) * 100 : 0,
      hourly: Object.entries(hourlyData)
        .map(([hour, counts]) => ({
          hour,
          ...counts,
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour)),
    };
  },

  /**
   * Generate sample payload for test webhook
   */
  generateSamplePayload(eventType: string): any {
    const samples: Record<string, any> = {
      'task:created': {
        event_id: crypto.randomUUID(),
        event_type: 'task:created',
        timestamp: new Date().toISOString(),
        data: {
          id: 'task-' + Math.random().toString(36).substr(2, 9),
          title: 'Sample Task',
          status: 'todo',
          priority: 'medium',
          createdAt: new Date().toISOString(),
        },
      },
      'rule:executed': {
        event_id: crypto.randomUUID(),
        event_type: 'rule:executed',
        timestamp: new Date().toISOString(),
        data: {
          rule_id: 'rule-' + Math.random().toString(36).substr(2, 9),
          rule_name: 'Sample Rule',
          execution_status: 'success',
          duration_ms: 125,
          matched_count: 3,
        },
      },
      'webhook:triggered': {
        event_id: crypto.randomUUID(),
        event_type: 'webhook:triggered',
        timestamp: new Date().toISOString(),
        data: {
          webhook_id: 'webhook-' + Math.random().toString(36).substr(2, 9),
          delivery_status: 'success',
          attempt: 1,
          response_time_ms: 450,
        },
      },
    };

    return samples[eventType] || samples['task:created'];
  },
};
