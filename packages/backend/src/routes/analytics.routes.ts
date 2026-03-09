import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { supabase } from '../lib/supabase';
import { CostSnapshotService } from '../services/cost-snapshot.service';

interface AnalyticsRoutesOptions {
  costSnapshotService?: CostSnapshotService;
}

export function createAnalyticsRoutes(options: AnalyticsRoutesOptions = {}) {
  const router = Router();
  const costSnapshotService =
    options.costSnapshotService || new CostSnapshotService(supabase as any);

  router.use(authMiddleware);

  router.post('/events', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { event, category, webhookId, metadata } = req.body;

      if (!event || !category) {
        return res.status(400).json({ error: 'event and category are required' });
      }

      const analyticsEvent = {
        user_id: userId,
        webhook_id: webhookId,
        event_name: event,
        category,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      };

      console.log('[Analytics]', {
        userId,
        event,
        category,
        webhookId,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ success: true, event: analyticsEvent });
    } catch (error) {
      next(error);
    }
  });

  router.get('/events', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ data: [], total: 0 });
    } catch (error) {
      next(error);
    }
  });

  router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = {
        webhooksCreated: 0,
        webhooksTested: 0,
        deliveriesTotal: 0,
        deliveriesSuccess: 0,
        deliveriesFailure: 0,
        averageResponseTime: 0,
        successRate: 0,
      };

      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  });

  router.get('/cost-summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = String((req as any).user.id || '');

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await costSnapshotService.getCostSummary(userId);
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  });

  router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = String((req as any).user.id || '');
      const costSummary = userId
        ? await costSnapshotService.getCostSummary(userId)
        : null;

      res.status(200).json({
        successRate: 0,
        avgDuration: 0,
        failedExecutions: [],
        costSavings: costSummary?.monthlySavings || 0,
        storageUtilization:
          (costSummary?.dbStorageGb || 0) + (costSummary?.s3StorageGb || 0),
        successTrend: [],
        durationTrend: [],
        costSummary,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const analyticsRoutes = createAnalyticsRoutes();
