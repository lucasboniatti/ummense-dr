/**
 * DLQ Service - API Client for Dead Letter Queue operations
 * Story 3.2: Webhook Reliability & Retry Logic
 */

import { apiClient } from './api.client';

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

export interface DLQQueryResult {
  items: DLQItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DLQStats {
  totalItems: number;
  oldestItem?: Date;
  newestItem?: Date;
  averageRetriesPerItem: number;
}

export interface DLQQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastErrorAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DLQFilters {
  webhookUrl?: string;
  errorContains?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * DLQ Service - Frontend API client for DLQ operations
 */
export class DLQService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * List DLQ items for an automation
   */
  async listDLQ(automationId: string, options?: DLQQueryOptions): Promise<DLQQueryResult> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq?${params.toString()}`;
    const { data } = await apiClient.get<DLQQueryResult>(url);
    return data;
  }

  /**
   * Get a single DLQ item
   */
  async getDLQItem(automationId: string, dlqItemId: string): Promise<DLQItem | null> {
    try {
      const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/${dlqItemId}`;
      const { data } = await apiClient.get<DLQItem>(url);
      return data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Retry a DLQ item
   */
  async retryDLQItem(automationId: string, dlqItemId: string): Promise<{ message: string }> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/${dlqItemId}/retry`;
    const { data } = await apiClient.post<{ message: string }>(url);
    return data;
  }

  /**
   * Clear a DLQ item
   */
  async clearDLQItem(automationId: string, dlqItemId: string): Promise<{ message: string }> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/${dlqItemId}`;
    const { data } = await apiClient.delete<{ message: string }>(url);
    return data;
  }

  /**
   * Query DLQ items with filters
   */
  async queryDLQ(
    automationId: string,
    filters?: DLQFilters,
    options?: DLQQueryOptions
  ): Promise<DLQQueryResult> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/query`;
    const body = {
      filters: {
        webhookUrl: filters?.webhookUrl,
        errorContains: filters?.errorContains,
        createdAfter: filters?.createdAfter?.toISOString(),
        createdBefore: filters?.createdBefore?.toISOString()
      },
      options
    };

    const { data } = await apiClient.post<DLQQueryResult>(url, body);
    return data;
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStats(automationId: string): Promise<DLQStats> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq-stats`;
    const { data } = await apiClient.get<DLQStats>(url);
    return data;
  }

  /**
   * Batch retry multiple DLQ items
   */
  async batchRetryDLQ(
    automationId: string,
    dlqItemIds: string[]
  ): Promise<{
    summary: { total: number; successful: number; failed: number };
    results: Array<{ dlqItemId: string; success: boolean; error?: string }>;
  }> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/batch-retry`;
    const { data } = await apiClient.post(url, { dlqItemIds });
    return data;
  }

  /**
   * Batch clear multiple DLQ items
   */
  async batchClearDLQ(
    automationId: string,
    dlqItemIds: string[]
  ): Promise<{
    summary: { total: number; successful: number; failed: number };
    results: Array<{ dlqItemId: string; success: boolean; error?: string }>;
  }> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/batch-clear`;
    const { data } = await apiClient.post(url, { dlqItemIds });
    return data;
  }
}

// Export singleton instance
export const dlqService = new DLQService();
