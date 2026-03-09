import { apiClient } from './api.client';

export interface CreateWebhookPayload {
  url: string;
  description?: string;
  enabled?: boolean;
}

export interface UpdateWebhookPayload {
  url?: string;
  description?: string;
  enabled?: boolean;
}

export interface TestWebhookPayload {
  event_type?: string;
  payload?: any;
}

export interface DeliveryHistoryFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const webhookService = {
  /**
   * List all webhooks
   */
  async listWebhooks() {
    const { data } = await apiClient.get('/webhooks');
    return data;
  },

  /**
   * Get webhook detail
   */
  async getWebhookDetail(webhookId: string) {
    const { data } = await apiClient.get(`/webhooks/${webhookId}`);
    return data;
  },

  /**
   * Create webhook
   */
  async createWebhook(payload: CreateWebhookPayload) {
    const { data } = await apiClient.post('/webhooks', payload);
    return data;
  },

  /**
   * Update webhook
   */
  async updateWebhook(webhookId: string, payload: UpdateWebhookPayload) {
    const { data } = await apiClient.put(`/webhooks/${webhookId}`, payload);
    return data;
  },

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string) {
    const { data } = await apiClient.delete(`/webhooks/${webhookId}`);
    return data;
  },

  /**
   * Test webhook (immediate send)
   */
  async testWebhook(webhookId: string, payload?: TestWebhookPayload) {
    const { data } = await apiClient.post(`/webhooks/${webhookId}/test`, payload || {});
    return data;
  },

  /**
   * Get delivery history
   */
  async getDeliveryHistory(
    webhookId: string,
    filters?: DeliveryHistoryFilters
  ) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    const endpoint = `/webhooks/${webhookId}/deliveries${query ? `?${query}` : ''}`;
    const { data } = await apiClient.get(endpoint);
    return data;
  },

  /**
   * Get delivery metrics
   */
  async getDeliveryMetrics(webhookId: string) {
    const { data } = await apiClient.get(`/webhooks/${webhookId}/metrics`);
    return data;
  },
};
