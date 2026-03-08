import { supabase } from '../lib/supabase';
import { AppError } from '../utils/errors';

type JsonRecord = Record<string, unknown>;

interface LogFilters {
  ruleId?: string;
  webhookId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  searchTerm?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

interface AlertConfigInput {
  ruleId?: string;
  rule_id?: string;
  failureRateThreshold?: number;
  failure_rate_threshold?: number;
  enabled?: boolean;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;
const MAX_EXPORT_ROWS = 10000;

function firstRow<T>(data: T[] | T | null): T | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data ?? null;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function clampLimit(limit?: number, max: number = MAX_LIMIT): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(Math.trunc(limit as number), max));
}

function normalizeDashboardMetrics(payload: JsonRecord | null) {
  const source = payload ?? {};

  return {
    rulesCount: normalizeNumber(source.rulesCount ?? source.rules_count),
    webhooksCount: normalizeNumber(source.webhooksCount ?? source.webhooks_count),
    eventsProcessed24h: normalizeNumber(
      source.eventsProcessed24h ?? source.events_processed_24h ?? source.events_processed
    ),
    successRate: normalizeNumber(source.successRate ?? source.success_rate),
    avgExecutionTimeMs: normalizeNumber(
      source.avgExecutionTimeMs ?? source.avg_execution_time_ms
    ),
  };
}

function normalizeTimeSeriesRow(payload: JsonRecord) {
  return {
    date: String(payload.date ?? ''),
    success: normalizeNumber(payload.success),
    failed: normalizeNumber(payload.failed),
  };
}

function normalizeRuleRow(payload: JsonRecord) {
  const name = String(payload.name ?? payload.rule_name ?? payload.rule_id ?? '');
  const failureRate = normalizeNumber(payload.failureRate ?? payload.failure_rate);
  const lastFailure = String(payload.lastFailure ?? payload.last_failure ?? '');

  return {
    rule_id: String(payload.rule_id ?? ''),
    name,
    rule_name: name,
    failures: normalizeNumber(payload.failures),
    successes: normalizeNumber(payload.successes),
    failureRate,
    failure_rate: failureRate,
    lastFailure,
    last_failure: lastFailure,
  };
}

function normalizeExecutionRow(payload: JsonRecord) {
  const executionId = String(payload.execution_id ?? payload.id ?? '');
  const status = String(payload.status ?? payload.execution_status ?? 'pending') as
    | 'success'
    | 'failed'
    | 'pending';
  const triggeredAt = String(payload.triggered_at ?? payload.created_at ?? new Date().toISOString());
  const executionTimeMs = normalizeNumber(payload.execution_time_ms ?? payload.duration_ms);

  return {
    id: executionId,
    execution_id: executionId,
    rule_id: String(payload.rule_id ?? ''),
    rule_name: String(payload.rule_name ?? payload.rule_id ?? ''),
    webhook_id: payload.webhook_id ? String(payload.webhook_id) : undefined,
    status,
    triggered_at: triggeredAt,
    execution_time_ms: executionTimeMs,
    duration_ms: executionTimeMs,
    error_message:
      payload.error_message === null || payload.error_message === undefined
        ? undefined
        : String(payload.error_message),
  };
}

function normalizeExecutionDetail(payload: JsonRecord, webhookUrl?: string) {
  const normalized = normalizeExecutionRow(payload);

  return {
    ...normalized,
    webhook_id: String(payload.webhook_id ?? normalized.webhook_id ?? ''),
    webhook_url: String(payload.webhook_url ?? webhookUrl ?? ''),
    rule_config: (payload.rule_config as JsonRecord | null) ?? undefined,
    conditions: (payload.conditions as JsonRecord | null) ?? undefined,
    actions: (payload.actions as JsonRecord | null) ?? undefined,
    error_trace:
      payload.error_trace === null || payload.error_trace === undefined
        ? undefined
        : String(payload.error_trace),
    retry_history: Array.isArray(payload.retry_history) ? payload.retry_history : [],
  };
}

function normalizeAlertRow(payload: JsonRecord) {
  return {
    id:
      payload.id === null || payload.id === undefined ? undefined : String(payload.id),
    rule_id: String(payload.rule_id ?? ''),
    rule_name: String(payload.rule_name ?? payload.rule_id ?? ''),
    failure_rate_threshold: normalizeNumber(payload.failure_rate_threshold),
    enabled: payload.enabled !== false,
    last_alert_at:
      payload.last_alert_at === null || payload.last_alert_at === undefined
        ? undefined
        : String(payload.last_alert_at),
  };
}

function escapeLike(value: string) {
  return value.replace(/[,%]/g, (char) => `\\${char}`);
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function parseDateFilter(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildLogSearchQuery(userId: string, filters: LogFilters) {
  const limit = clampLimit(filters.limit);
  const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
  const status = filters.status;
  const startDate = parseDateFilter(filters.startDate ?? filters.dateFrom);
  const endDate = parseDateFilter(filters.endDate ?? filters.dateTo);
  const searchTerm = (filters.searchTerm ?? filters.search ?? '').trim();

  let query = supabase
    .from('automation_logs')
    .select(
      'id, rule_id, webhook_id, status, execution_status, triggered_at, created_at, execution_time_ms, duration_ms, error_message'
    )
    .eq('user_id', userId);

  if (filters.ruleId) {
    query = query.eq('rule_id', filters.ruleId);
  }

  if (filters.webhookId) {
    query = query.eq('webhook_id', filters.webhookId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (startDate) {
    query = query.gte('triggered_at', startDate);
  }

  if (endDate) {
    query = query.lte('triggered_at', endDate);
  }

  if (searchTerm) {
    const escaped = escapeLike(searchTerm);
    query = query.or(
      `rule_id.ilike.%${escaped}%,webhook_id.ilike.%${escaped}%,error_message.ilike.%${escaped}%`
    );
  }

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    timestamp: { column: 'triggered_at', ascending: false },
    duration: { column: 'execution_time_ms', ascending: false },
    status: { column: 'status', ascending: true },
  };

  const sortConfig = sortMap[filters.sortBy ?? 'timestamp'] ?? sortMap.timestamp;

  return query
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(offset, offset + limit - 1);
}

export const automationService = {
  async getDashboardMetrics(userId: string) {
    const { data, error } = await supabase.rpc('get_dashboard_metrics', {
      p_user_id: userId,
    });

    if (error) {
      throw new AppError('Failed to fetch dashboard metrics');
    }

    return normalizeDashboardMetrics(firstRow(data as JsonRecord[] | JsonRecord | null));
  },

  async searchLogs(userId: string, filters: LogFilters = {}) {
    const { data, error } = await buildLogSearchQuery(userId, filters);

    if (error) {
      throw new AppError('Failed to fetch automation logs');
    }

    return (data ?? []).map((row) => normalizeExecutionRow(row as JsonRecord));
  },

  async getAutomationLogs(userId: string, filters: LogFilters = {}) {
    return this.searchLogs(userId, filters);
  },

  async getExecutionDetail(userId: string, executionId: string) {
    const { data, error } = await supabase
      .from('automation_logs')
      .select(
        'id, rule_id, webhook_id, status, execution_status, triggered_at, created_at, execution_time_ms, duration_ms, error_message, rule_config, conditions, actions, error_trace, retry_history'
      )
      .eq('user_id', userId)
      .eq('id', executionId)
      .maybeSingle();

    if (error) {
      throw new AppError('Failed to fetch execution detail');
    }

    if (!data) {
      return null;
    }

    let webhookUrl = '';
    if (data.webhook_id) {
      const { data: webhookData } = await supabase
        .from('webhooks')
        .select('url')
        .eq('id', data.webhook_id)
        .eq('user_id', userId)
        .maybeSingle();

      webhookUrl = webhookData?.url ?? '';
    }

    return normalizeExecutionDetail(data as JsonRecord, webhookUrl);
  },

  async getAlertConfig(userId: string) {
    const { data, error } = await supabase
      .from('automation_alerts')
      .select('id, rule_id, failure_rate_threshold, enabled, last_alert_at')
      .eq('user_id', userId)
      .order('rule_id', { ascending: true });

    if (error) {
      throw new AppError('Failed to fetch alert configuration');
    }

    return (data ?? []).map((row) => normalizeAlertRow(row as JsonRecord));
  },

  async updateAlertConfig(userId: string, config: AlertConfigInput | AlertConfigInput[]) {
    const input = Array.isArray(config) ? config : [config];

    if (input.length === 0) {
      return [];
    }

    const rows = input.map((entry) => {
      const threshold = normalizeNumber(
        entry.failureRateThreshold ?? entry.failure_rate_threshold
      );

      if (threshold < 0 || threshold > 100) {
        throw new AppError('failureRateThreshold must be between 0 and 100', 400);
      }

      const ruleId = entry.ruleId ?? entry.rule_id;
      if (!ruleId) {
        throw new AppError('ruleId is required', 400);
      }

      return {
        user_id: userId,
        rule_id: ruleId,
        failure_rate_threshold: threshold,
        enabled: entry.enabled !== false,
        updated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await supabase
      .from('automation_alerts')
      .upsert(rows, { onConflict: 'user_id,rule_id' })
      .select('id, rule_id, failure_rate_threshold, enabled, last_alert_at');

    if (error) {
      throw new AppError('Failed to update alert configuration');
    }

    return (data ?? []).map((row) => normalizeAlertRow(row as JsonRecord));
  },

  async getTimeSeries(userId: string) {
    const { data, error } = await supabase.rpc('get_time_series', {
      p_user_id: userId,
    });

    if (error) {
      throw new AppError('Failed to fetch time series');
    }

    return (data ?? []).map((row) => normalizeTimeSeriesRow(row as JsonRecord));
  },

  async getTopFailingRules(userId: string, limit: number) {
    const { data, error } = await supabase.rpc('get_top_failing_rules', {
      p_user_id: userId,
      p_limit: clampLimit(limit, 100),
    });

    if (error) {
      throw new AppError('Failed to fetch top failing rules');
    }

    return (data ?? []).map((row) => normalizeRuleRow(row as JsonRecord));
  },

  async getRecentExecutions(userId: string, limit: number) {
    const { data, error } = await supabase
      .from('automation_logs')
      .select(
        'id, rule_id, webhook_id, status, execution_status, triggered_at, created_at, execution_time_ms, duration_ms, error_message'
      )
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(clampLimit(limit, 100));

    if (error) {
      throw new AppError('Failed to fetch recent executions');
    }

    return (data ?? []).map((row) => normalizeExecutionRow(row as JsonRecord));
  },

  async exportCsv(userId: string, filters: LogFilters = {}) {
    const logs = await this.searchLogs(userId, {
      ...filters,
      limit: clampLimit(filters.limit ?? MAX_EXPORT_ROWS, MAX_EXPORT_ROWS),
      offset: 0,
      sortBy: filters.sortBy ?? 'timestamp',
    });

    const rows = [
      ['Timestamp', 'Rule ID', 'Webhook ID', 'Status', 'Duration (ms)', 'Error Message'],
      ...logs.map((log) => [
        log.triggered_at,
        log.rule_id,
        log.webhook_id ?? '',
        log.status,
        String(log.execution_time_ms),
        log.error_message ?? '',
      ]),
    ];

    return rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
  },

  async checkAlertThresholds(userId: string, ruleId: string) {
    const { data: alert, error: alertError } = await supabase
      .from('automation_alerts')
      .select('id, rule_id, failure_rate_threshold, enabled, last_alert_at')
      .eq('user_id', userId)
      .eq('rule_id', ruleId)
      .maybeSingle();

    if (alertError) {
      throw new AppError('Failed to load alert threshold');
    }

    if (!alert || alert.enabled === false) {
      return { shouldAlert: false, failureRate: 0 };
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('status')
      .eq('user_id', userId)
      .eq('rule_id', ruleId)
      .gte('triggered_at', oneHourAgo);

    if (logsError) {
      throw new AppError('Failed to evaluate alert threshold');
    }

    const totalExecutions = logs?.length ?? 0;
    if (totalExecutions === 0) {
      return { shouldAlert: false, failureRate: 0 };
    }

    const failedExecutions =
      logs?.filter((log) => (log as JsonRecord).status === 'failed').length ?? 0;
    const failureRate = Number(((failedExecutions / totalExecutions) * 100).toFixed(2));
    const threshold = normalizeNumber(alert.failure_rate_threshold);
    const shouldAlert = failureRate >= threshold;

    if (shouldAlert) {
      const now = new Date();
      const lastAlertAt = alert.last_alert_at ? new Date(alert.last_alert_at) : null;
      const cooldownMs = 5 * 60 * 1000;

      if (!lastAlertAt || now.getTime() - lastAlertAt.getTime() >= cooldownMs) {
        await supabase
          .from('automation_alerts')
          .update({ last_alert_at: now.toISOString(), updated_at: now.toISOString() })
          .eq('id', alert.id)
          .eq('user_id', userId);
      }
    }

    return { shouldAlert, failureRate };
  },
};
