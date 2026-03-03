/**
 * DLQ Service - API Client for Dead Letter Queue operations
 * Story 3.2: Webhook Reliability & Retry Logic
 */

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

  constructor(baseUrl: string = '/api') {
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
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to list DLQ items: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a single DLQ item
   */
  async getDLQItem(automationId: string, dlqItemId: string): Promise<DLQItem | null> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/${dlqItemId}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get DLQ item: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Retry a DLQ item
   */
  async retryDLQItem(automationId: string, dlqItemId: string): Promise<{ message: string }> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/${dlqItemId}/retry`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to retry DLQ item: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Clear a DLQ item
   */
  async clearDLQItem(automationId: string, dlqItemId: string): Promise<{ message: string }> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq/${dlqItemId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to clear DLQ item: ${response.statusText}`);
    }

    return response.json();
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

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to query DLQ: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStats(automationId: string): Promise<DLQStats> {
    const url = `${this.baseUrl}/automations/${automationId}/webhooks/dlq-stats`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get DLQ stats: ${response.statusText}`);
    }

    return response.json();
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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dlqItemIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to batch retry: ${response.statusText}`);
    }

    return response.json();
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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dlqItemIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to batch clear: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const dlqService = new DLQService();
