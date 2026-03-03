import Queue from 'bull';
import { rateLimiter } from '../rate-limiter/rate-limiter.service';
import { circuitBreaker } from '../circuit-breaker/circuit-breaker.service';
import { logger } from '../../utils/logger';

// Setup Redis connection for Bull Queue
export const MAX_QUEUE_SIZE = 10000;
export const MAX_CONCURRENT = 1000;

export const executionQueue = new Queue('automations', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10)
    },
    settings: {
        maxStalledCount: 2,
        stalledInterval: 5000
    }
});

// A mock function for active execution count
let activeExecutions = 0;
export const getActiveExecutionCount = async () => activeExecutions;
export const incrementActiveCount = () => { activeExecutions++; };
export const decrementActiveCount = () => { if (activeExecutions > 0) activeExecutions--; };

// State variable for manual pause/resume controls
export let isQueuePaused = false;

// Queue Processor
executionQueue.process(async (job) => {
    if (isQueuePaused) {
        throw new Error('Queue is paused manually');
    }

    const { automationId, triggerData, connectorId } = job.data;

    // 1. Check Circuit Breaker for the specific connector
    const isCircuitBroken = await circuitBreaker.isCircuitOpen(connectorId);
    if (isCircuitBroken) {
        logger.warn(`Circuit is OPEN for connector ${connectorId}. Re-queuing job ${job.id}`);
        const state = circuitBreaker.getState(connectorId);
        if (state.nextRetryAt) {
            const waitMs = Math.max(0, state.nextRetryAt.getTime() - Date.now());
            throw new Error(`Circuit open. Retry after ${waitMs}ms`);
        } else {
            throw new Error('Circuit open indefinitely');
        }
    }

    // 2. Check Global Concurrency limit
    const activeCount = await getActiveExecutionCount();
    if (activeCount >= MAX_CONCURRENT) {
        logger.warn(`Max global concurrency (${MAX_CONCURRENT}) reached. Active: ${activeCount}`);
        throw new Error('Max concurrency reached');
    }

    // 3. Check Per-connector rate limiting
    const rateLimitOk = await rateLimiter.checkLimit(connectorId);
    if (!rateLimitOk.allowed && rateLimitOk.waitMs) {
        logger.info(`Rate limit exceeded for connector ${connectorId}. Delaying job ${job.id} by ${rateLimitOk.waitMs}ms`);
        // Re-queue directly into delayed states shouldn't throw to avoid incrementing attempt count unnecessarily for rate limits
        // But throwing an error here triggers Bull's retry mechanism which is simpler for now.
        throw new Error(`Rate limit exceeded. Wait ${rateLimitOk.waitMs}ms`);
    }

    // 4. Execute the actual automation (mock for now)
    incrementActiveCount();
    try {
        logger.debug(`Executing automation ${automationId} for connector ${connectorId}`);
        // await executeAutomation(automationId, triggerData);

        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 100));

        // Record success for circuit breaker (closes it if it was open)
        await circuitBreaker.recordSuccess(connectorId);
        return { success: true, executedAt: new Date().toISOString() };
    } finally {
        decrementActiveCount();
    }
});

// Event listeners for Circuit Breaker logic
executionQueue.on('failed', async (job, err) => {
    logger.error(`Job ${job.id} failed: ${err.message}`);
    if (job.data && job.data.connectorId) {
        // Determine if error is a rate limit/concurrency error or a real integration failure
        if (!err.message.includes('Rate limit exceeded') &&
            !err.message.includes('Max concurrency reached') &&
            !err.message.includes('Queue is paused manually') &&
            !err.message.includes('Circuit open')) {
            logger.warn(`Recording failure for connector ${job.data.connectorId}`);
            await circuitBreaker.recordFailure(job.data.connectorId);
        }
    }
});

executionQueue.on('completed', async (job) => {
    if (job.data && job.data.connectorId) {
        await circuitBreaker.recordSuccess(job.data.connectorId);
    }
});

// Helper for Pause / Resume
export const pauseQueue = () => { isQueuePaused = true; };
export const resumeQueue = () => { isQueuePaused = false; };
