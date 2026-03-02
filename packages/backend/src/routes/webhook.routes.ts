import { Router, Request, Response, NextFunction } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Middleware: Require authentication for all webhook routes
router.use(authMiddleware);

/**
 * Webhook Management API Routes
 * Base path: /api/webhooks
 */

// GET /api/webhooks
router.get('/', webhookController.listWebhooks);

// GET /api/webhooks/:id
router.get('/:id', webhookController.getWebhookDetail);

// POST /api/webhooks
router.post('/', webhookController.createWebhook);

// PUT /api/webhooks/:id
router.put('/:id', webhookController.updateWebhook);

// DELETE /api/webhooks/:id
router.delete('/:id', webhookController.deleteWebhook);

// POST /api/webhooks/:id/test
router.post('/:id/test', webhookController.testWebhook);

// GET /api/webhooks/:id/deliveries
router.get('/:id/deliveries', webhookController.getDeliveryHistory);

// GET /api/webhooks/:id/metrics
router.get('/:id/metrics', webhookController.getDeliveryMetrics);

export const webhookRoutes = router;
