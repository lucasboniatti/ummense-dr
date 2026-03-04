const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001';

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

interface TestWebhookPayload {
  event_type?: string;
  payload?: any;
}

interface DeliveryHistoryFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

async function request(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const webhookService = {
  /**
   * List all webhooks
   */
  async listWebhooks() {
    return request('/webhooks');
  },

  /**
   * Get webhook detail
   */
  async getWebhookDetail(webhookId: string) {
    return request(`/webhooks/${webhookId}`);
  },

  /**
   * Create webhook
   */
  async createWebhook(payload: CreateWebhookPayload) {
    return request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update webhook
   */
  async updateWebhook(webhookId: string, payload: UpdateWebhookPayload) {
    return request(`/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string) {
    return request(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Test webhook (immediate send)
   */
  async testWebhook(webhookId: string, payload?: TestWebhookPayload) {
    return request(`/webhooks/${webhookId}/test`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
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
    return request(endpoint);
  },

  /**
   * Get delivery metrics
   */
  async getDeliveryMetrics(webhookId: string) {
    return request(`/webhooks/${webhookId}/metrics`);
  },
};
