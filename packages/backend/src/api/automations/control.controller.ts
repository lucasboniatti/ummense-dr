import { Request, Response } from 'express';
import { queueService } from '../../automations/queue/queue.service';
import { circuitBreaker } from '../../automations/circuit-breaker/circuit-breaker.service';
import { rateLimiter } from '../../automations/rate-limiter/rate-limiter.service';
import { asString } from '../../utils/http';

export class ControlController {

    // POST /api/automations/queue/pause
    async pauseQueue(req: Request, res: Response) {
        try {
            const result = await queueService.pauseExecutionQueue();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/automations/queue/resume
    async resumeQueue(req: Request, res: Response) {
        try {
            const result = await queueService.resumeExecutionQueue();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/automations/queue/clear
    async clearQueue(req: Request, res: Response) {
        try {
            const result = await queueService.clearQueue();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/automations/queue/enqueue
    // Testing route for enqueue
    async enqueueTest(req: Request, res: Response) {
        try {
            const { automationId, triggerData, connectorId } = req.body;
            if (!automationId || !connectorId) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const result = await queueService.enqueueExecution(automationId, triggerData, connectorId);
            res.status(200).json(result);
        } catch (error: any) {
            if (error.status === 429) {
                return res.status(429).json({ error: error.message });
            }
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/automations/circuit-breaker/reset
    async resetCircuitBreaker(req: Request, res: Response) {
        try {
            const { connectorId } = req.body;
            if (!connectorId) {
                return res.status(400).json({ error: 'Missing connectorId' });
            }
            await circuitBreaker.resetCircuit(connectorId);
            res.status(200).json({ success: true, message: `Circuit reset for ${connectorId}` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/automations/rate-limit
    async setRateLimit(req: Request, res: Response) {
        try {
            const { connectorId, rps, concurrent } = req.body;
            if (!connectorId || typeof rps !== 'number' || typeof concurrent !== 'number') {
                return res.status(400).json({ error: 'Missing required configuration fields' });
            }
            await rateLimiter.setLimit(connectorId, rps, concurrent);
            res.status(200).json({ success: true, message: `Rate limit configured for ${connectorId}` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/automations/circuit-breaker/:connectorId
    async getCircuitBreakerState(req: Request, res: Response) {
        try {
            const connectorId = asString((req.params as any).connectorId);
            const state = circuitBreaker.getState(connectorId);
            res.status(200).json(state);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/automations/rate-limit/:connectorId
    async getRateLimitStatus(req: Request, res: Response) {
        try {
            const connectorId = asString((req.params as any).connectorId);
            const status = await rateLimiter.getLimit(connectorId);
            res.status(200).json(status);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}

export const controlController = new ControlController();
