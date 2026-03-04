import { Router, Request, Response } from 'express';
import { queueService } from '../../automations/queue/queue.service';
import { controlRoutes } from '../automations/control.routes';

const router = Router();

// Add control routes to /api/automations
router.use('/automations', controlRoutes);

// Add queue metrics to /api/status/queue
router.get('/queue', async (req: Request, res: Response) => {
    try {
        const queueStatus = await queueService.getQueueStatus();
        res.status(200).json(queueStatus);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// A system-wide health check incorporating queue health
router.get('/health', async (req: Request, res: Response) => {
    try {
        const queueStatus = await queueService.getQueueStatus();

        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            components: {
                queue: queueStatus.percentFull < 80 ? 'healthy' : 'degraded',
            },
            metrics: {
                queueDepth: queueStatus.queueDepth,
                percentFull: queueStatus.percentFull,
                isPaused: queueStatus.isPaused
            }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

export const statusRoutes = router;
