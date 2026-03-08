import { Response } from 'express';
import { automationService } from '../services/automation.service';
import { AppError } from '../utils/errors';

function getUserId(req: any) {
  return String(req.user?.id ?? '');
}

function handleControllerError(res: Response, err: unknown, fallbackMessage: string) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : fallbackMessage;
  res.status(500).json({ error: message });
}

async function getDashboardMetrics(req: any, res: Response) {
  try {
    const metrics = await automationService.getDashboardMetrics(getUserId(req));
    res.json(metrics);
  } catch (err) {
    handleControllerError(res, err, 'Failed to fetch metrics');
  }
}

async function searchLogs(req: any, res: Response) {
  try {
    const {
      ruleId,
      webhookId,
      status,
      startDate,
      endDate,
      dateFrom,
      dateTo,
      search,
      searchTerm,
      sortBy,
      limit = '50',
      offset = '0',
    } = req.query ?? {};

    const logs = await automationService.searchLogs(getUserId(req), {
      ruleId,
      webhookId,
      status,
      startDate,
      endDate,
      dateFrom,
      dateTo,
      search,
      searchTerm,
      sortBy,
      limit: Number.parseInt(String(limit), 10),
      offset: Number.parseInt(String(offset), 10),
    });

    res.json(logs);
  } catch (err) {
    handleControllerError(res, err, 'Failed to fetch logs');
  }
}

async function getExecutionDetail(req: any, res: Response) {
  try {
    const { executionId } = req.params;
    const detail = await automationService.getExecutionDetail(getUserId(req), executionId);

    if (!detail) {
      res.status(404).json({ error: 'Execution not found' });
      return;
    }

    res.json(detail);
  } catch (err) {
    handleControllerError(res, err, 'Failed to fetch execution detail');
  }
}

async function getAlertConfig(req: any, res: Response) {
  try {
    const alerts = await automationService.getAlertConfig(getUserId(req));
    res.json(alerts);
  } catch (err) {
    handleControllerError(res, err, 'Failed to fetch alert configuration');
  }
}

async function updateAlertConfig(req: any, res: Response) {
  try {
    const thresholds = req.body?.thresholds;
    const payload =
      Array.isArray(thresholds) && thresholds.length > 0
        ? thresholds
        : {
            ruleId: req.body?.ruleId,
            failureRateThreshold: req.body?.failureRateThreshold,
            enabled: req.body?.enabled,
          };

    const updated = await automationService.updateAlertConfig(getUserId(req), payload);
    res.json(updated);
  } catch (err) {
    handleControllerError(res, err, 'Failed to update alert configuration');
  }
}

async function getTimeSeries(req: any, res: Response) {
  try {
    const timeSeries = await automationService.getTimeSeries(getUserId(req));
    res.json(timeSeries);
  } catch (err) {
    handleControllerError(res, err, 'Failed to fetch time series');
  }
}

async function getTopFailingRules(req: any, res: Response) {
  try {
    const { limit = '10' } = req.query ?? {};
    const rules = await automationService.getTopFailingRules(
      getUserId(req),
      Number.parseInt(String(limit), 10)
    );
    res.json(rules);
  } catch (err) {
    handleControllerError(res, err, 'Failed to fetch top failing rules');
  }
}

async function getRecentExecutions(req: any, res: Response) {
  try {
    const { limit = '50' } = req.query ?? {};
    const executions = await automationService.getRecentExecutions(
      getUserId(req),
      Number.parseInt(String(limit), 10)
    );
    res.json(executions);
  } catch (err) {
    handleControllerError(res, err, 'Failed to fetch recent executions');
  }
}

async function exportCsv(req: any, res: Response) {
  try {
    const source = req.method === 'GET' ? req.query : req.body;
    const csv = await automationService.exportCsv(getUserId(req), {
      ruleId: source?.ruleId,
      webhookId: source?.webhookId,
      status: source?.status,
      startDate: source?.startDate,
      endDate: source?.endDate,
      dateFrom: source?.dateFrom,
      dateTo: source?.dateTo,
      search: source?.search,
      searchTerm: source?.searchTerm,
      sortBy: source?.sortBy,
      limit: Number.parseInt(String(source?.limit ?? '10000'), 10),
      offset: 0,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="automation-logs.csv"');
    res.send(csv);
  } catch (err) {
    handleControllerError(res, err, 'Failed to export CSV');
  }
}

export const automationController = {
  getMetrics: getDashboardMetrics,
  getDashboardMetrics,
  getLogs: searchLogs,
  searchLogs,
  getExecutionDetail,
  getAlerts: getAlertConfig,
  getAlertConfig,
  updateAlerts: updateAlertConfig,
  updateAlertConfig,
  getTimeSeries,
  getTopFailingRules,
  getRecentExecutions,
  exportCsv,
};
