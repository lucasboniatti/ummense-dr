import { executionQueue, getActiveExecutionCount, pauseQueue, resumeQueue, MAX_QUEUE_SIZE } from '../automations/queue/execution-queue';
import { QueueService } from '../automations/queue/queue.service';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

describe('ExecutionQueue Integration', () => {
    let queueService: QueueService;

    beforeAll(async () => {
        queueService = new QueueService();
        // Start fresh
        await queueService.clearQueue();
    });

    afterAll(async () => {
        // Teardown
        await queueService.clearQueue();
        // Make sure we resume it in case it was paused
        await queueService.resumeExecutionQueue();
        await executionQueue.close();
    });

    it('should successfully enqueue and process a job', async () => {
        const automationId = 'test-automation-1';
        const triggerData = { test: true };
        const connectorId = 'test-connector';

        const { jobId, queueDepth } = await queueService.enqueueExecution(automationId, triggerData, connectorId);

        expect(jobId).toBeDefined();
        expect(queueDepth).toBeGreaterThan(0);

        // Give Bull a moment to process the job
        await delay(200);

        const status = await queueService.getQueueStatus();
        expect(status.waitingCount + status.activeCount).toBe(0); // Job should be completed
    });

    it('should allow pausing and resuming the queue', async () => {
        const automationId = 'test-automation-2';
        const triggerData = { test: true };
        const connectorId = 'paused-connector';

        // Pause the queue
        await queueService.pauseExecutionQueue();

        // Add job while paused
        await queueService.enqueueExecution(automationId, triggerData, connectorId);

        // Wait and verify job is still waiting (not processed)
        await delay(300);
        const preStatus = await queueService.getQueueStatus();
        expect(preStatus.isPaused).toBe(true);
        expect(preStatus.waitingCount).toBeGreaterThan(0);

        // Resume the queue
        await queueService.resumeExecutionQueue();

        // Wait for processing
        await delay(500);

        const postStatus = await queueService.getQueueStatus();
        expect(postStatus.isPaused).toBe(false);
        expect(postStatus.waitingCount).toBe(0); // Job should be processed
    });

    it('should handle clearing the queue', async () => {
        const automationId = 'test-automation-3';
        const triggerData = { test: true };
        const connectorId = 'clear-connector';

        // Pause first so jobs just queue up
        await queueService.pauseExecutionQueue();

        await queueService.enqueueExecution(automationId, triggerData, connectorId);
        await queueService.enqueueExecution(automationId, triggerData, connectorId);

        let status = await queueService.getQueueStatus();
        expect(status.waitingCount).toBeGreaterThanOrEqual(2);

        // Clear the queue
        await queueService.clearQueue();

        status = await queueService.getQueueStatus();
        expect(status.waitingCount).toBe(0);

        // Resume for teardown
        await queueService.resumeExecutionQueue();
    });
});
