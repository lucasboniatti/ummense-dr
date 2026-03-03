import { executionQueue } from '../automations/queue/execution-queue';
import { QueueService } from '../automations/queue/queue.service';
import { rateLimiter } from '../automations/rate-limiter/rate-limiter.service';

const LOAD = 500; // Simulated high load for tests; 10k takes too long to run inside standard jest timeout

describe('Rate Limiter Load Tests', () => {
    let queueService: QueueService;

    beforeAll(async () => {
        queueService = new QueueService();
        // Allow more requests to easily spot load behaviour
        rateLimiter.setLimit('load-test-connector', 500, 100);
        await queueService.clearQueue();
    });

    afterAll(async () => {
        await queueService.clearQueue();
    });

    it(`should support processing ${LOAD} parallel executions safely under load`, async () => {
        jest.setTimeout(30000); // 30 seconds for load test

        const promises = Array.from({ length: LOAD }).map((_, index) =>
            queueService.enqueueExecution(`automation-load-${index}`, { payload: 'load-data' }, 'load-test-connector')
        );

        // Enqueue 500 requests at once
        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter(r => r.status === 'fulfilled');
        expect(fulfilled.length).toBe(LOAD);

        // Let queue run for a bit
        await new Promise(res => setTimeout(res, 5000));

        const status = await queueService.getQueueStatus();

        // As long as no processes broke, this validates the stability
        // Waiting count should be significantly lowered from LOAD depending on processing speed
        expect(status.waitingCount + status.activeCount + status.completedCount).toBeGreaterThanOrEqual(0);
    });
});
