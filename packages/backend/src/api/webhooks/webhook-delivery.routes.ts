/**
 * Webhook Delivery API Routes
 * Story 3.2: Webhook Reliability & Retry Logic
 * Handles DLQ management endpoints
 */

import { Router, Request, Response } from 'express';
import { WebhookDeliveryController } from './webhook-delivery.controller';

const router = Router();
const controller = new WebhookDeliveryController();

/**
 * DLQ Management Routes
 */

/**
 * GET /api/automations/:automationId/webhooks/dlq
 * List DLQ items for an automation with pagination
 * Query params:
 *   - page: number (default: 1)
 *   - limit: number (default: 20)
 *   - sortBy: 'createdAt' | 'lastErrorAt' (default: 'createdAt')
 *   - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
router.get('/automations/:automationId/webhooks/dlq', async (req: Request, res: Response) => {
  try {
    const automationId = req.params.automationId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const result = await controller.listDLQ(automationId, {
      page,
      limit,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/automations/:automationId/webhooks/dlq/:dlqItemId
 * Get a single DLQ item with full details
 */
router.get(
  '/automations/:automationId/webhooks/dlq/:dlqItemId',
  async (req: Request, res: Response) => {
    try {
      const dlqItemId = req.params.dlqItemId;
      const result = await controller.getDLQItem(dlqItemId);

      if (!result) {
        return res.status(404).json({ error: 'DLQ item not found' });
      }

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /api/automations/:automationId/webhooks/dlq/:dlqItemId/retry
 * Manually retry a failed webhook from DLQ
 * Resets retry count and moves back to pending status
 */
router.post(
  '/automations/:automationId/webhooks/dlq/:dlqItemId/retry',
  async (req: Request, res: Response) => {
    try {
      const dlqItemId = req.params.dlqItemId;
      const result = await controller.retryDLQItem(dlqItemId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ message: 'Webhook retry initiated', dlqItemId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * DELETE /api/automations/:automationId/webhooks/dlq/:dlqItemId
 * Clear/remove a DLQ item (mark as reviewed)
 */
router.delete(
  '/automations/:automationId/webhooks/dlq/:dlqItemId',
  async (req: Request, res: Response) => {
    try {
      const dlqItemId = req.params.dlqItemId;
      const result = await controller.clearDLQItem(dlqItemId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ message: 'DLQ item cleared', dlqItemId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /api/automations/:automationId/webhooks/dlq/query
 * Advanced query for DLQ items with filters
 * Body:
 *   - filters: {
 *       webhookUrl?: string,
 *       errorContains?: string,
 *       createdAfter?: ISO8601,
 *       createdBefore?: ISO8601
 *     }
 *   - options: { page?, limit?, sortBy?, sortOrder? }
 */
router.post(
  '/automations/:automationId/webhooks/dlq/query',
  async (req: Request, res: Response) => {
    try {
      const automationId = req.params.automationId;
      const { filters, options } = req.body;

      const result = await controller.queryDLQ(automationId, filters, options);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * GET /api/automations/:automationId/webhooks/dlq-stats
 * Get DLQ statistics for an automation
 */
router.get('/automations/:automationId/webhooks/dlq-stats', async (req: Request, res: Response) => {
  try {
    const automationId = req.params.automationId;
    const stats = await controller.getDLQStats(automationId);
    res.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/automations/:automationId/webhooks/dlq/batch-retry
 * Retry multiple DLQ items at once
 * Body:
 *   - dlqItemIds: string[]
 */
router.post(
  '/automations/:automationId/webhooks/dlq/batch-retry',
  async (req: Request, res: Response) => {
    try {
      const { dlqItemIds } = req.body;

      if (!Array.isArray(dlqItemIds) || dlqItemIds.length === 0) {
        return res.status(400).json({ error: 'dlqItemIds must be a non-empty array' });
      }

      const results = await controller.batchRetryDLQ(dlqItemIds);
      res.json(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /api/automations/:automationId/webhooks/dlq/batch-clear
 * Clear multiple DLQ items at once
 * Body:
 *   - dlqItemIds: string[]
 */
router.post(
  '/automations/:automationId/webhooks/dlq/batch-clear',
  async (req: Request, res: Response) => {
    try {
      const { dlqItemIds } = req.body;

      if (!Array.isArray(dlqItemIds) || dlqItemIds.length === 0) {
        return res.status(400).json({ error: 'dlqItemIds must be a non-empty array' });
      }

      const results = await controller.batchClearDLQ(dlqItemIds);
      res.json(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

export default router;
