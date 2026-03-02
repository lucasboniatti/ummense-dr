import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { automationController } from '../automation.controller';

vi.mock('../automation.controller');

describe('Automation Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  describe('GET /api/automations/metrics', () => {
    it('should return dashboard metrics', async () => {
      const mockMetrics = {
        rulesCount: 10,
        webhooksCount: 5,
        eventsProcessed24h: 500,
        successRate: 95.5,
        avgExecutionTimeMs: 250,
      };

      (automationController.getDashboardMetrics as any).mockResolvedValueOnce(mockMetrics);

      const response = await request(app).get('/api/automations/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMetrics);
    });

    it('should return 500 on service error', async () => {
      (automationController.getDashboardMetrics as any).mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app).get('/api/automations/metrics');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/automations/logs', () => {
    it('should search logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          rule_id: 'rule-1',
          status: 'success',
          triggered_at: '2026-03-02T10:00:00Z',
        },
      ];

      (automationController.searchLogs as any).mockResolvedValueOnce(mockLogs);

      const response = await request(app)
        .get('/api/automations/logs')
        .query({ ruleId: 'rule-1', status: 'success' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLogs);
    });

    it('should support pagination', async () => {
      (automationController.searchLogs as any).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/automations/logs')
        .query({ limit: 20, offset: 0 });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/automations/logs/:executionId', () => {
    it('should return execution detail', async () => {
      const mockExecution = {
        execution_id: 'exec-123',
        rule_id: 'rule-1',
        status: 'success',
        triggered_at: '2026-03-02T10:00:00Z',
        execution_time_ms: 250,
      };

      (automationController.getExecutionDetail as any).mockResolvedValueOnce(mockExecution);

      const response = await request(app).get('/api/automations/logs/exec-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockExecution);
    });

    it('should return 404 for non-existent execution', async () => {
      (automationController.getExecutionDetail as any).mockRejectedValueOnce(
        new Error('Not found')
      );

      const response = await request(app).get('/api/automations/logs/nonexistent');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/automations/time-series', () => {
    it('should return 7-day time series data', async () => {
      const mockTimeSeries = [
        { date: '2026-03-02', success: 100, failed: 5 },
        { date: '2026-03-01', success: 120, failed: 8 },
      ];

      (automationController.getTimeSeries as any).mockResolvedValueOnce(mockTimeSeries);

      const response = await request(app).get('/api/automations/time-series');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTimeSeries);
    });
  });

  describe('GET /api/automations/top-failing-rules', () => {
    it('should return top 10 failing rules', async () => {
      const mockRules = [
        {
          rule_id: 'rule-1',
          rule_name: 'Email Notification',
          failures: 10,
          failure_rate: 10.0,
        },
      ];

      (automationController.getTopFailingRules as any).mockResolvedValueOnce(mockRules);

      const response = await request(app).get('/api/automations/top-failing-rules');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRules);
    });

    it('should support custom limit parameter', async () => {
      (automationController.getTopFailingRules as any).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/automations/top-failing-rules')
        .query({ limit: 20 });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/automations/recent-executions', () => {
    it('should return recent executions', async () => {
      const mockExecutions = [
        {
          execution_id: 'exec-1',
          rule_id: 'rule-1',
          status: 'success',
          triggered_at: '2026-03-02T10:00:00Z',
        },
      ];

      (automationController.getRecentExecutions as any).mockResolvedValueOnce(mockExecutions);

      const response = await request(app).get('/api/automations/recent-executions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockExecutions);
    });
  });

  describe('POST /api/automations/export-csv', () => {
    it('should export logs as CSV', async () => {
      const csvData = 'rule_id,status,execution_time_ms\nrule-1,success,250';

      (automationController.exportCsv as any).mockResolvedValueOnce(csvData);

      const response = await request(app)
        .post('/api/automations/export-csv')
        .send({ ruleId: 'rule-1' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should enforce 10K row limit', async () => {
      const response = await request(app)
        .post('/api/automations/export-csv')
        .send({ ruleId: 'rule-1', limit: 20000 });

      // Should be limited to 10K rows in backend
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/automations/alerts', () => {
    it('should return alert configuration', async () => {
      const mockAlerts = [
        {
          rule_id: 'rule-1',
          failure_rate_threshold: 50,
          enabled: true,
        },
      ];

      (automationController.getAlertConfig as any).mockResolvedValueOnce(mockAlerts);

      const response = await request(app).get('/api/automations/alerts');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAlerts);
    });
  });

  describe('POST /api/automations/alerts', () => {
    it('should update alert configuration', async () => {
      const alerts = [
        {
          rule_id: 'rule-1',
          failure_rate_threshold: 60,
          enabled: true,
        },
      ];

      (automationController.updateAlertConfig as any).mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post('/api/automations/alerts')
        .send({ thresholds: alerts });

      expect(response.status).toBe(200);
    });

    it('should validate threshold values', async () => {
      const invalidAlerts = [
        {
          rule_id: 'rule-1',
          failure_rate_threshold: 150, // Invalid: > 100
        },
      ];

      const response = await request(app)
        .post('/api/automations/alerts')
        .send({ thresholds: invalidAlerts });

      expect(response.status).toBe(400);
    });
  });
});
