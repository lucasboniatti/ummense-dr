import { Router } from 'express';
import { controlController } from './control.controller';

const router = Router();

// Queue management
router.post('/queue/pause', controlController.pauseQueue);
router.post('/queue/resume', controlController.resumeQueue);
router.post('/queue/clear', controlController.clearQueue);
router.post('/queue/enqueue', controlController.enqueueTest); // test route for queue

// Circuit Breaker management
router.post('/circuit-breaker/reset', controlController.resetCircuitBreaker);
router.get('/circuit-breaker/:connectorId', controlController.getCircuitBreakerState);

// Rate Limit management
router.post('/rate-limit', controlController.setRateLimit);
router.get('/rate-limit/:connectorId', controlController.getRateLimitStatus);

export const controlRoutes = router;
