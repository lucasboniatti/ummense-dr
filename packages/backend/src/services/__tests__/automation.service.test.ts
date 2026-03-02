import { describe, it, expect, vi, beforeEach } from 'vitest';
import { automationService } from '../automation.service';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase');

describe('AutomationService', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should retrieve dashboard metrics from pre-aggregated table', async () => {
      const mockMetrics = {
        rulesCount: 10,
        webhooksCount: 5,
        eventsProcessed24h: 500,
        successRate: 95.5,
        avgExecutionTimeMs: 250,
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockMetrics,
        error: null,
      });

      const result = await automationService.getDashboardMetrics(mockUserId);

      expect(result).toEqual(mockMetrics);
      expect(supabase.rpc).toHaveBeenCalledWith('get_dashboard_metrics', {
        p_user_id: mockUserId,
      });
    });

    it('should handle rpc errors gracefully', async () => {
      const mockError = new Error('Database error');

      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      await expect(automationService.getDashboardMetrics(mockUserId)).rejects.toThrow(
        'Failed to fetch dashboard metrics'
      );
    });
  });

  describe('getTopFailingRules', () => {
    it('should retrieve top failing rules sorted by failure rate', async () => {
      const mockRules = [
        {
          rule_id: 'rule-1',
          rule_name: 'Email Notification',
          failures: 10,
          successes: 90,
          failure_rate: 10.0,
          last_failure: '2026-03-02T10:00:00Z',
        },
        {
          rule_id: 'rule-2',
          rule_name: 'Slack Alert',
          failures: 5,
          successes: 95,
          failure_rate: 5.0,
          last_failure: '2026-03-02T09:00:00Z',
        },
      ];

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockRules,
        error: null,
      });

      const result = await automationService.getTopFailingRules(mockUserId, 10);

      expect(result).toEqual(mockRules);
      expect(supabase.rpc).toHaveBeenCalledWith('get_top_failing_rules', {
        p_user_id: mockUserId,
        p_limit: 10,
      });
    });
  });

  describe('getTimeSeries', () => {
    it('should retrieve 7-day time series data', async () => {
      const mockTimeSeries = [
        { date: '2026-03-02', success: 100, failed: 5 },
        { date: '2026-03-01', success: 120, failed: 8 },
        { date: '2026-02-28', success: 110, failed: 6 },
      ];

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockTimeSeries,
        error: null,
      });

      const result = await automationService.getTimeSeries(mockUserId);

      expect(result).toEqual(mockTimeSeries);
      expect(supabase.rpc).toHaveBeenCalledWith('get_time_series', {
        p_user_id: mockUserId,
      });
    });
  });

  describe('getExecutionDetail', () => {
    it('should retrieve full execution trace by ID', async () => {
      const executionId = 'exec-123';
      const mockExecution = {
        execution_id: executionId,
        rule_id: 'rule-1',
        rule_name: 'Test Rule',
        webhook_id: 'webhook-1',
        webhook_url: 'https://example.com/webhook',
        triggered_at: '2026-03-02T10:00:00Z',
        status: 'success',
        execution_time_ms: 250,
        rule_config: { name: 'Test Rule', conditions: [] },
        conditions: { passed: true },
        actions: { executed: true },
        error_trace: null,
        retry_history: [],
      };

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: mockExecution,
              error: null,
            }),
          }),
        }),
      });

      const result = await automationService.getExecutionDetail(mockUserId, executionId);

      expect(result).toEqual(mockExecution);
    });

    it('should throw error if execution not found', async () => {
      const executionId = 'nonexistent';

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      });

      await expect(automationService.getExecutionDetail(mockUserId, executionId)).rejects.toThrow();
    });
  });

  describe('searchLogs', () => {
    it('should search logs with filters', async () => {
      const filters = {
        ruleId: 'rule-1',
        status: 'failed',
        limit: 20,
        offset: 0,
      };

      const mockLogs = [
        {
          id: 'log-1',
          rule_id: 'rule-1',
          webhook_id: 'webhook-1',
          status: 'failed',
          triggered_at: '2026-03-02T10:00:00Z',
          execution_time_ms: 1500,
          error_message: 'Timeout',
        },
      ];

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              range: vi.fn().mockReturnValueOnce({
                order: vi.fn().mockResolvedValueOnce({
                  data: mockLogs,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await automationService.searchLogs(mockUserId, filters);

      expect(result).toEqual(mockLogs);
    });
  });

  describe('getAlertConfig', () => {
    it('should retrieve alert configuration for user', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          rule_id: 'rule-1',
          failure_rate_threshold: 50,
          enabled: true,
        },
        {
          id: 'alert-2',
          rule_id: 'rule-2',
          failure_rate_threshold: 30,
          enabled: false,
        },
      ];

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: mockAlerts,
            error: null,
          }),
        }),
      });

      const result = await automationService.getAlertConfig(mockUserId);

      expect(result).toEqual(mockAlerts);
    });
  });

  describe('updateAlertConfig', () => {
    it('should update alert thresholds', async () => {
      const alerts = [
        {
          rule_id: 'rule-1',
          failure_rate_threshold: 60,
          enabled: true,
        },
      ];

      (supabase.from as any).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValueOnce({
          data: alerts,
          error: null,
        }),
      });

      await automationService.updateAlertConfig(mockUserId, alerts as any);

      expect(supabase.from).toHaveBeenCalledWith('automation_alerts');
    });
  });
});
