/**
 * DLQService - Dead Letter Queue management for failed webhooks
 * Story 3.2: Webhook Reliability & Retry Logic
 * Handles querying, retrying, and clearing DLQ items
 */

import { v4 as uuidv4 } from 'uuid';
import { WebhookDeliveryService } from './webhook-delivery.service';

export interface DLQItem {
  id: string;
  automationId: string;
  webhookDeliveryId: string;
  webhookUrl: string;
  payload: Record<string, unknown>;
  retryCount: number;
  lastError: string;
  lastErrorAt: string;
  clearedAt?: string | null;
  createdAt: string;
}

export interface DLQQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastErrorAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DLQQueryResult {
  items: DLQItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * DLQService - Manages Dead Letter Queue operations
 */
export class DLQService {
  /**
   * List DLQ items for an automation with pagination
   */
  async list(
    automationId: string,
    options: DLQQueryOptions = {},
    db: any
  ): Promise<DLQQueryResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    // Get total count
    const countResult = await db('dlq_items')
      .where('automation_id', automationId)
      .where('cleared_at', null) // Only uncleaned items
      .count('* as total')
      .first();

    const total = countResult?.total || 0;

    // Get paginated items
    const items = await db('dlq_items')
      .select('*')
      .where('automation_id', automationId)
      .where('cleared_at', null)
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      items: items.map(this.mapDLQItem),
      total,
      page,
      limit,
      hasMore: offset + limit < total
    };
  }

  /**
   * Get a single DLQ item by ID
   */
  async get(dlqItemId: string, db: any): Promise<DLQItem | null> {
    const item = await db('dlq_items')
      .select('*')
      .where('id', dlqItemId)
      .first();

    return item ? this.mapDLQItem(item) : null;
  }

  /**
   * Manually retry a DLQ item
   * Resets retry count and moves back to pending
   */
  async retry(dlqItemId: string, db: any): Promise<{ success: boolean; error?: string }> {
    try {
      const dlqItem = await this.get(dlqItemId, db);
      if (!dlqItem) {
        return { success: false, error: 'DLQ item not found' };
      }

      const now = new Date().toISOString();
      const deliveryService = new WebhookDeliveryService();

      // Get the original delivery record
      const delivery = await db('webhook_deliveries')
        .select('*')
        .where('id', dlqItem.webhookDeliveryId)
        .first();

      if (!delivery) {
        return { success: false, error: 'Webhook delivery record not found' };
      }

      // Reset to attempt 1 and move back to pending
      const firstRetryTime = deliveryService.getNextRetryTime(0);

      await db('webhook_deliveries')
        .where('id', dlqItem.webhookDeliveryId)
        .update({
          status: 'pending',
          attemptNumber: 1,
          nextRetryAt: firstRetryTime,
          errorMessage: null,
          errorContext: null,
          updatedAt: now
        });

      // Remove from DLQ
      await db('dlq_items')
        .where('id', dlqItemId)
        .update({
          clearedAt: now
        });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Clear a DLQ item (mark as reviewed/resolved)
   */
  async clear(dlqItemId: string, db: any): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();

      await db('dlq_items')
        .where('id', dlqItemId)
        .update({
          clearedAt: now
        });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Query DLQ items by automation with filters
   */
  async query(
    automationId: string,
    filters?: {
      webhookUrl?: string;
      errorContains?: string;
      createdAfter?: Date;
      createdBefore?: Date;
    },
    options?: DLQQueryOptions,
    db?: any
  ): Promise<DLQQueryResult> {
    let query = db('dlq_items')
      .select('*')
      .where('automation_id', automationId)
      .where('cleared_at', null);

    if (filters) {
      if (filters.webhookUrl) {
        query = query.where('webhook_url', 'like', `%${filters.webhookUrl}%`);
      }

      if (filters.errorContains) {
        query = query.where('last_error', 'like', `%${filters.errorContains}%`);
      }

      if (filters.createdAfter) {
        query = query.where('created_at', '>=', filters.createdAfter.toISOString());
      }

      if (filters.createdBefore) {
        query = query.where('created_at', '<=', filters.createdBefore.toISOString());
      }
    }

    // Get total count for this query
    const countResult = await query
      .clone()
      .count('* as total')
      .first();
    const total = countResult?.total || 0;

    // Apply pagination and sorting
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';

    const items = await query
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    return {
      items: items.map((item: any) => this.mapDLQItem(item)),
      total,
      page,
      limit,
      hasMore: offset + limit < total
    };
  }

  /**
   * Get statistics for a DLQ
   */
  async getStats(automationId: string, db: any): Promise<{
    totalItems: number;
    oldestItem?: Date;
    newestItem?: Date;
    averageRetriesPerItem: number;
  }> {
    const stats = await db('dlq_items')
      .select(
        db.raw('COUNT(*) as totalItems'),
        db.raw('MIN(created_at) as oldestItem'),
        db.raw('MAX(created_at) as newestItem'),
        db.raw('AVG(retry_count) as avgRetries')
      )
      .where('automation_id', automationId)
      .where('cleared_at', null)
      .first();

    return {
      totalItems: stats?.totalItems || 0,
      oldestItem: stats?.oldestItem ? new Date(stats.oldestItem) : undefined,
      newestItem: stats?.newestItem ? new Date(stats.newestItem) : undefined,
      averageRetriesPerItem: Math.round(stats?.avgRetries || 0)
    };
  }

  /**
   * Map database row to DLQItem interface
   */
  private mapDLQItem(row: any): DLQItem {
    return {
      id: row.id,
      automationId: row.automation_id,
      webhookDeliveryId: row.webhook_delivery_id,
      webhookUrl: row.webhook_url,
      payload: row.payload,
      retryCount: row.retry_count,
      lastError: row.last_error,
      lastErrorAt: row.last_error_at,
      clearedAt: row.cleared_at,
      createdAt: row.created_at
    };
  }
}
