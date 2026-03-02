import express, { Router } from 'express';
import { automationController } from '../controllers/automation.controller';

export const automationRoutes: Router = express.Router();

// Middleware: Authenticate user
automationRoutes.use((req: any, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// GET dashboard metrics (KPIs)
automationRoutes.get('/metrics', automationController.getMetrics);

// GET automation logs with filtering
automationRoutes.get('/logs', automationController.getLogs);

// GET execution detail
automationRoutes.get('/logs/:executionId', automationController.getExecutionDetail);

// GET alert configuration
automationRoutes.get('/alerts', automationController.getAlerts);

// POST/PUT alert configuration
automationRoutes.post('/alerts', automationController.updateAlerts);

// GET time series data (7-day breakdown)
automationRoutes.get('/time-series', automationController.getTimeSeries);

// GET top failing rules
automationRoutes.get('/top-failing-rules', automationController.getTopFailingRules);

// GET recent executions (real-time ready)
automationRoutes.get('/recent-executions', automationController.getRecentExecutions);

// POST export CSV
automationRoutes.post('/export-csv', automationController.exportCsv);
