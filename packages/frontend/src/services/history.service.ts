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

class HistoryService {
  /**
   * Fetch autocomplete suggestions for history search
   */
  async getSearchSuggestions(limit: number = 10): Promise<string[]> {
    const response = await fetch(`/api/automations/history/suggestions?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch search suggestions');
    }

    const data = await response.json();
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

    const response = await fetch(`/api/automations/history?${query}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution history');
    }

    return response.json();
  }

  /**
   * Fetch single execution detail
   */
  async getExecutionDetail(executionId: string) {
    const response = await fetch(`/api/automations/history/${executionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch execution detail');
    }

    return response.json();
  }

  /**
   * Export execution history as CSV
   */
  async exportAsCSV(params?: any) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }

    const response = await fetch(`/api/automations/history/export/csv?${query}`);
    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    const blob = await response.blob();
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
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }

    const response = await fetch(`/api/automations/history/export/json?${query}`);
    if (!response.ok) {
      throw new Error('Failed to export JSON');
    }

    const blob = await response.blob();
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

    const response = await fetch(`/api/automations/audit-log?${query}`);
    if (!response.ok) {
      throw new Error('Failed to fetch audit logs');
    }

    return response.json();
  }

  /**
   * Fetch user retention policy
   */
  async getRetentionPolicy(): Promise<RetentionPolicy> {
    const response = await fetch('/api/automations/retention-policy');
    if (!response.ok) {
      throw new Error('Failed to fetch retention policy');
    }

    return response.json();
  }

  /**
   * Update user retention policy
   */
  async updateRetentionPolicy(params: {
    retentionDays: number;
    archiveEnabled?: boolean;
    archiveBucket?: string;
  }): Promise<RetentionPolicy> {
    const response = await fetch('/api/automations/retention-policy', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update retention policy');
    }

    return response.json();
  }
}

export const historyService = new HistoryService();
