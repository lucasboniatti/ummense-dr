import { executionQueue, MAX_QUEUE_SIZE, pauseQueue, resumeQueue, isQueuePaused, getActiveExecutionCount } from './execution-queue';
import { circuitBreaker } from '../circuit-breaker/circuit-breaker.service';
import { logger } from '../../utils/logger';

export class QueueService {
    constructor() { }

    /**
     * Enqueue a new execution into Bull Queue with Backpressure handling
     */
    async enqueueExecution(automationId: string, triggerData: any, connectorId: string) {
        const queueDepth = await executionQueue.count();

        if (queueDepth >= MAX_QUEUE_SIZE) {
            // Return 429 Too Many Requests in route handler
            const error = new Error('Queue full - try again later');
            (error as any).status = 429;
            throw error;
        }

        const job = await executionQueue.add(
            { automationId, triggerData, connectorId },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: true, // Auto cleanup when done
                removeOnFail: false // Keep failed for inspection
            }
        );

        return { jobId: job.id, queueDepth: queueDepth + 1 };
    }

    /**
     * Get queue status for metrics and health checks
     */
    async getQueueStatus() {
        const counts = await executionQueue.getJobCounts();
        const queueDepth = counts.waiting + counts.active;

        // In bull 3.x, getJobs with waiting status might be used to find the oldest
        // For simplicity without additional plugins, we approximate or just omit actual age if difficult
        // const oldestJob = await executionQueue.getJobs(['waiting'], 0, 1, true);
        // const oldestItemAge = oldestJob && oldestJob.length > 0 ? Date.now() - oldestJob[0].timestamp : null;

        return {
            queueDepth,
            activeCount: counts.active,
            waitingCount: counts.waiting,
            failedCount: counts.failed,
            delayedCount: counts.delayed,
            percentFull: Math.round((queueDepth / MAX_QUEUE_SIZE) * 100),
            isPaused: isQueuePaused,
            systemActiveExecutions: await getActiveExecutionCount()
        };
    }

    /**
     * Pause execution queue
     */
    async pauseExecutionQueue() {
        pauseQueue();
        await executionQueue.pause(true); // pause local processing
        return { success: true, message: 'Queue processing paused' };
    }

    /**
     * Resume execution queue
     */
    async resumeExecutionQueue() {
        resumeQueue();
        await executionQueue.resume(true); // resume local processing
        return { success: true, message: 'Queue processing resumed' };
    }

    /**
     * Clear all waiting and delayed jobs
     */
    async clearQueue() {
        await executionQueue.empty();
        return { success: true, message: 'Queue cleared successfully' };
    }
}

export const queueService = new QueueService();
