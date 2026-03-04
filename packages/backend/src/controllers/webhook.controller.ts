import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service';
import { AppError } from '../utils/errors';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export const webhookController = {
  /**
   * GET /api/webhooks
   * List all webhooks for authenticated user
   */
  async listWebhooks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const webhooks = await webhookService.listWebhooks(userId);
      res.status(200).json(webhooks);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/webhooks/:id
   * Get webhook detail with delivery history
   */
  async getWebhookDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const webhookId = firstParam(req.params.id);
      if (!webhookId) {
        throw new AppError('Webhook id is required', 400);
      }

      const webhook = await webhookService.getWebhookDetail(userId, webhookId);
      if (!webhook) {
        throw new AppError('Webhook not found', 404);
      }

      res.status(200).json(webhook);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/webhooks
   * Create new webhook
   * Body: { url, description, enabled }
   */
  async createWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { url, description, enabled = true } = req.body;

      // Validate required fields
      if (!url) {
        throw new AppError('URL is required', 400);
      }

      const webhook = await webhookService.createWebhook(userId, {
        url,
        description,
        enabled,
      });

      res.status(201).json(webhook);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/webhooks/:id
   * Update webhook
   * Body: { url?, description?, enabled? }
   */
  async updateWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const webhookId = firstParam(req.params.id);
      if (!webhookId) {
        throw new AppError('Webhook id is required', 400);
      }
      const updateData = req.body;

      const webhook = await webhookService.updateWebhook(
        userId,
        webhookId,
        updateData
      );
      if (!webhook) {
        throw new AppError('Webhook not found', 404);
      }

      res.status(200).json(webhook);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/webhooks/:id
   * Soft delete webhook (keeps history)
   */
  async deleteWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const webhookId = firstParam(req.params.id);
      if (!webhookId) {
        throw new AppError('Webhook id is required', 400);
      }

      const success = await webhookService.deleteWebhook(userId, webhookId);
      if (!success) {
        throw new AppError('Webhook not found', 404);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/webhooks/:id/test
   * Send test webhook payload immediately (bypass queue)
   * Body: { event_type?, payload? }
   */
  async testWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const webhookId = firstParam(req.params.id);
      if (!webhookId) {
        throw new AppError('Webhook id is required', 400);
      }
      const { event_type = 'task:created', payload } = req.body;

      const result = await webhookService.testWebhook(
        userId,
        webhookId,
        event_type,
        payload
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/webhooks/:id/deliveries
   * Get delivery history for webhook
   * Query params: status, startDate, endDate, search, limit (default 50)
   */
  async getDeliveryHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const webhookId = firstParam(req.params.id);
      if (!webhookId) {
        throw new AppError('Webhook id is required', 400);
      }
      const {
        status,
        startDate,
        endDate,
        search,
        limit = 50,
        offset = 0,
      } = req.query;

      const deliveries = await webhookService.getDeliveryHistory(
        userId,
        webhookId,
        {
          status: status as string | undefined,
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          search: search as string | undefined,
          limit: Math.min(parseInt(firstParam(limit as any) || '50', 10), 500),
          offset: parseInt(firstParam(offset as any) || '0', 10) || 0,
        }
      );

      res.status(200).json(deliveries);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/webhooks/:id/metrics
   * Get delivery metrics for last 24 hours
   */
  async getDeliveryMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const webhookId = firstParam(req.params.id);
      if (!webhookId) {
        throw new AppError('Webhook id is required', 400);
      }

      const metrics = await webhookService.getDeliveryMetrics(
        userId,
        webhookId
      );

      res.status(200).json(metrics);
    } catch (error) {
      next(error);
    }
  },
};
