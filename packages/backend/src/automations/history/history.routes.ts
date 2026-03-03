import { Router } from 'express';
import { ExecutionHistoryService } from './history.service';
import { AuditRequest, logAuditAction } from './audit.middleware';

export function createHistoryRoutes(historyService: ExecutionHistoryService) {
  const router = Router();

  /**
   * GET /api/automations/history
   * Query execution history with filters
   */
  router.get('/history', async (req: AuditRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        automationId,
        startDate,
        endDate,
        status,
        errorType,
        searchTerm,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = req.query;

      const result = await historyService.queryExecutionHistory({
        userId: req.user.id,
        automationId: automationId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as 'success' | 'failed' | 'skipped',
        errorType: errorType as string,
        searchTerm: searchTerm as string,
        sortBy: (sortBy as 'timestamp' | 'status' | 'duration') || 'timestamp',
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(result);
    } catch (error) {
      console.error('Error querying history:', error);
      res.status(500).json({ error: 'Failed to query execution history' });
    }
  });

  /**
   * GET /api/automations/history/:executionId
   * Get single execution detail with steps
   */
  router.get('/history/:executionId', async (req: AuditRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await historyService.getExecutionDetail(
        req.params.executionId,
        req.user.id
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching execution detail:', error);
      res.status(500).json({ error: 'Failed to fetch execution detail' });
    }
  });

  /**
   * GET /api/automations/history/export/csv
   * Export execution history as CSV
   */
  router.get('/history/export/csv', async (req: AuditRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { automationId, startDate, endDate, status } = req.query;

      const csv = await historyService.exportAsCSV({
        userId: req.user.id,
        automationId: automationId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as 'success' | 'failed' | 'skipped',
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=execution-history.csv');
      res.send(csv);

      // Log the export action
      await logAuditAction(res, 'export_executions', undefined);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  });

  /**
   * GET /api/automations/history/export/json
   * Export execution history as JSON
   */
  router.get('/history/export/json', async (req: AuditRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { automationId, startDate, endDate, status } = req.query;

      const json = await historyService.exportAsJSON({
        userId: req.user.id,
        automationId: automationId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as 'success' | 'failed' | 'skipped',
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=execution-history.json');
      res.send(json);

      // Log the export action
      await logAuditAction(res, 'export_executions', undefined);
    } catch (error) {
      console.error('Error exporting JSON:', error);
      res.status(500).json({ error: 'Failed to export JSON' });
    }
  });

  /**
   * GET /api/automations/audit-log
   * Get audit logs
   */
  router.get('/audit-log', async (req: AuditRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { automationId, limit, offset } = req.query;

      const result = await historyService.getAuditLogs(
        req.user.id,
        automationId as string,
        limit ? parseInt(limit as string) : 50,
        offset ? parseInt(offset as string) : 0
      );

      res.json(result);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  /**
   * GET /api/automations/retention-policy
   * Get user's retention policy
   */
  router.get('/retention-policy', async (req: AuditRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const policy = await historyService.getUserRetentionPolicy(req.user.id);
      res.json(policy);
    } catch (error) {
      console.error('Error fetching retention policy:', error);
      res.status(500).json({ error: 'Failed to fetch retention policy' });
    }
  });

  /**
   * PUT /api/automations/retention-policy
   * Update user's retention policy
   */
  router.put('/retention-policy', async (req: AuditRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { retentionDays, archiveEnabled, archiveBucket } = req.body;

      if (retentionDays < 90 || retentionDays > 2190) {
        return res.status(400).json({
          error: 'Retention days must be between 90 and 2190',
        });
      }

      const oldPolicy = await historyService.getUserRetentionPolicy(req.user.id);

      const updatedPolicy = await historyService.updateRetentionPolicy(
        req.user.id,
        retentionDays,
        archiveEnabled,
        archiveBucket
      );

      // Log the change
      await logAuditAction(res, 'update_retention_policy', undefined, {
        old: oldPolicy,
        new: updatedPolicy,
      });

      res.json(updatedPolicy);
    } catch (error) {
      console.error('Error updating retention policy:', error);
      res.status(500).json({ error: 'Failed to update retention policy' });
    }
  });

  return router;
}
