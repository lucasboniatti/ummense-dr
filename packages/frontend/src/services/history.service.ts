/**
 * Frontend service for execution history and audit log operations
 */

export interface ExecutionHistoryResponse {
  executions: any[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogResponse {
  logs: any[];
  total: number;
  limit: number;
  offset: number;
}

export interface RetentionPolicy {
  id: string;
  user_id: string;
  retention_days: number;
  archive_enabled: boolean;
  archive_bucket?: string;
  updated_at: string;
}

export interface SavedFilterDefinition {
  automationId?: string;
  status?: 'success' | 'failed' | 'skipped';
  dateRange?: '24h' | '7d' | '30d';
  searchTerm?: string;
  sortBy?: 'timestamp' | 'status' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export interface SavedFilterPreset {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  filter_json: SavedFilterDefinition;
  is_default: boolean;
  created_at: string;
  deleted_at?: string | null;
}

import { apiClient } from './api.client';

class HistoryService {
  /**
   * Fetch autocomplete suggestions for history search
   */
  async getSearchSuggestions(limit: number = 10): Promise<string[]> {
    const { data } = await apiClient.get(`/automations/history/suggestions?limit=${limit}`);
    return Array.isArray(data.suggestions) ? data.suggestions : [];
  }

  /**
   * Fetch execution history with filters
   */
  async queryExecutionHistory(params: {
    automationId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: 'success' | 'failed' | 'skipped';
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }): Promise<ExecutionHistoryResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value instanceof Date) {
          query.append(key, value.toISOString());
        } else {
          query.append(key, String(value));
        }
      }
    });

    const { data } = await apiClient.get<ExecutionHistoryResponse>(`/automations/history?${query}`);
    return data;
  }

  /**
   * Fetch single execution detail
   */
  async getExecutionDetail(executionId: string) {
    const { data } = await apiClient.get(`/automations/history/${executionId}`);
    return data;
  }

  /**
   * Export execution history as CSV
   */
  async exportAsCSV(params?: any) {
    const query = buildQueryParams(params);

    const response = await apiClient.get(`/automations/history/export/csv?${query}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'execution-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export execution history as JSON
   */
  async exportAsJSON(params?: any) {
    const query = buildQueryParams(params);

    const response = await apiClient.get(`/automations/history/export/json?${query}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'execution-history.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Fetch audit logs
   */
  async getAuditLogs(params: {
    automationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });

    const { data } = await apiClient.get<AuditLogResponse>(`/automations/audit-log?${query}`);
    return data;
  }

  /**
   * Fetch user retention policy
   */
  async getRetentionPolicy(): Promise<RetentionPolicy> {
    const { data } = await apiClient.get<RetentionPolicy>('/automations/retention-policy');
    return data;
  }

  /**
   * Update user retention policy
   */
  async updateRetentionPolicy(params: {
    retentionDays: number;
    archiveEnabled?: boolean;
    archiveBucket?: string;
  }): Promise<RetentionPolicy> {
    const { data } = await apiClient.put<RetentionPolicy>('/automations/retention-policy', params);
    return data;
  }

  async listSavedFilters(): Promise<SavedFilterPreset[]> {
    const { data } = await apiClient.get('/users/saved-filters');
    return Array.isArray(data) ? data : [];
  }

  async createSavedFilter(params: {
    name: string;
    description?: string;
    filter_json: SavedFilterDefinition;
  }): Promise<SavedFilterPreset> {
    const { data } = await apiClient.post<SavedFilterPreset>('/users/saved-filters', params);
    return data;
  }

  async deleteSavedFilter(id: string): Promise<void> {
    await apiClient.delete(`/users/saved-filters/${id}`);
  }
}

export const historyService = new HistoryService();

function buildQueryParams(params?: Record<string, unknown>): URLSearchParams {
  const query = new URLSearchParams();

  if (!params) {
    return query;
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (value instanceof Date) {
      query.append(key, value.toISOString());
      return;
    }

    query.append(key, String(value));
  });

  return query;
}
