import { apiClient } from './api.client';

export interface DashboardMetrics {
  rulesCount: number;
  webhooksCount: number;
  eventsProcessed24h: number;
  successRate: number;
  avgExecutionTimeMs: number;
}

export interface TimeSeriesData {
  date: string;
  success: number;
  failed: number;
}

export interface Rule {
  rule_id: string;
  name: string;
  failures: number;
  successes: number;
  failureRate: number;
  lastFailure: string;
}

export interface Execution {
  execution_id: string;
  rule_id: string;
  rule_name: string;
  webhook_id?: string;
  status: 'success' | 'failed' | 'pending';
  triggered_at: string;
  execution_time_ms: number;
  error_message?: string;
}

export interface AutomationLog {
  id: string;
  rule_id: string;
  webhook_id: string;
  status: 'success' | 'failed' | 'pending';
  triggered_at: string;
  execution_time_ms: number;
  error_message?: string;
}

export interface ExecutionDetail {
  execution_id: string;
  rule_id: string;
  rule_name: string;
  webhook_id: string;
  webhook_url: string;
  triggered_at: string;
  status: 'success' | 'failed' | 'pending';
  execution_time_ms: number;
  rule_config?: Record<string, any>;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  error_trace?: string;
  retry_history?: Array<{
    attempt: number;
    status: string;
    timestamp: string;
    error?: string;
  }>;
}

export interface AlertThreshold {
  rule_id: string;
  rule_name: string;
  failure_rate_threshold: number;
  enabled: boolean;
}

export interface LogSearchFilters {
  ruleId?: string;
  webhookId?: string;
  status?: 'success' | 'failed' | 'pending';
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

class AutomationService {
  async getMetrics(): Promise<DashboardMetrics> {
    const response = await apiClient.get('/api/automations/metrics');
    return response.data;
  }

  async getTimeSeries(days: number = 7): Promise<TimeSeriesData[]> {
    const response = await apiClient.get('/api/automations/time-series', {
      params: { days },
    });
    return response.data;
  }

  async getTopFailingRules(limit: number = 10): Promise<Rule[]> {
    const response = await apiClient.get('/api/automations/top-failing-rules', {
      params: { limit },
    });
    return response.data;
  }

  async getRecentExecutions(limit: number = 50): Promise<Execution[]> {
    const response = await apiClient.get('/api/automations/recent-executions', {
      params: { limit },
    });
    return response.data;
  }

  async getExecutionDetail(executionId: string): Promise<ExecutionDetail> {
    const response = await apiClient.get(`/api/automations/logs/${executionId}`);
    return response.data;
  }

  async searchLogs(filters: LogSearchFilters): Promise<AutomationLog[]> {
    const response = await apiClient.get('/api/automations/logs', {
      params: filters,
    });
    return response.data;
  }

  async exportCsvLogs(filters: LogSearchFilters): Promise<Blob> {
    const response = await apiClient.get('/api/automations/export-csv', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }

  async getAlertConfig(): Promise<AlertThreshold[]> {
    const response = await apiClient.get('/api/automations/alerts');
    return response.data;
  }

  async updateAlertConfig(thresholds: AlertThreshold[]): Promise<void> {
    await apiClient.post('/api/automations/alerts', { thresholds });
  }
}

export const automationService = new AutomationService();
