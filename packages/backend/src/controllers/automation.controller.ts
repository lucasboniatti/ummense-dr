import { Request, Response } from 'express';
import { automationService } from '../services/automation.service';

export const automationController = {
  // Get dashboard KPIs (pre-aggregated metrics)
  getMetrics: async (req: any, res: Response) => {
    try {
      const metrics = await automationService.getDashboardMetrics(req.user.id);
      res.json(metrics);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Get automation logs with filtering
  getLogs: async (req: any, res: Response) => {
    try {
      const { ruleId, webhookId, status, startDate, endDate, search, sortBy, limit = 50 } = req.query;
      const logs = await automationService.getAutomationLogs(req.user.id, {
        ruleId,
        webhookId,
        status,
        startDate,
        endDate,
        search,
        sortBy,
        limit: parseInt(limit),
      });
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Get execution detail with full trace
  getExecutionDetail: async (req: any, res: Response) => {
    try {
      const { executionId } = req.params;
      const detail = await automationService.getExecutionDetail(req.user.id, executionId);
      if (!detail) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      res.json(detail);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Get alert configuration
  getAlerts: async (req: any, res: Response) => {
    try {
      const alerts = await automationService.getAlertConfig(req.user.id);
      res.json(alerts);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Update alert configuration
  updateAlerts: async (req: any, res: Response) => {
    try {
      const { ruleId, failureRateThreshold, maxExecutionTime, notificationMethod } = req.body;
      const updated = await automationService.updateAlertConfig(req.user.id, {
        ruleId,
        failureRateThreshold,
        maxExecutionTime,
        notificationMethod,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Get 7-day time series (success/failure breakdown)
  getTimeSeries: async (req: any, res: Response) => {
    try {
      const timeSeries = await automationService.getTimeSeries(req.user.id);
      res.json(timeSeries);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Get top failing rules
  getTopFailingRules: async (req: any, res: Response) => {
    try {
      const { limit = 10 } = req.query;
      const rules = await automationService.getTopFailingRules(req.user.id, parseInt(limit));
      res.json(rules);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Get recent executions (last 50)
  getRecentExecutions: async (req: any, res: Response) => {
    try {
      const { limit = 50 } = req.query;
      const executions = await automationService.getRecentExecutions(req.user.id, parseInt(limit));
      res.json(executions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },

  // Export CSV
  exportCsv: async (req: any, res: Response) => {
    try {
      const { ruleId, webhookId, status, startDate, endDate, search } = req.body;
      const csv = await automationService.exportCsv(req.user.id, {
        ruleId,
        webhookId,
        status,
        startDate,
        endDate,
        search,
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="automation-logs.csv"');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
};
