export interface QueueMetrics {
    queueDepth: number;
    activeCount: number;
    waitingCount: number;
    failedCount: number;
    delayedCount: number;
    percentFull: number;
    isPaused: boolean;
    systemActiveExecutions: number;
}

export interface CircuitBreakerState {
    connectorId: string;
    failureCount: number;
    state: 'healthy' | 'degraded' | 'offline';
    lastFailureAt?: Date;
    nextRetryAt?: Date;
}

export interface RateLimitStatus {
    rps: number;
    concurrent: number;
}

class ControlService {
    async fetchQueueStatus(): Promise<QueueMetrics> {
        const res = await fetch('/api/status/queue');
        if (!res.ok) throw new Error('Failed to fetch queue status');
        return res.json();
    }

    async pauseQueue(): Promise<{ success: boolean; message: string }> {
        const res = await fetch('/api/automations/queue/pause', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to pause queue');
        return res.json();
    }

    async resumeQueue(): Promise<{ success: boolean; message: string }> {
        const res = await fetch('/api/automations/queue/resume', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to resume queue');
        return res.json();
    }

    async clearQueue(): Promise<{ success: boolean; message: string }> {
        const res = await fetch('/api/automations/queue/clear', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to clear queue');
        return res.json();
    }

    async fetchCircuitBreaker(connectorId: string): Promise<CircuitBreakerState> {
        const res = await fetch(`/api/automations/circuit-breaker/${connectorId}`);
        if (!res.ok) throw new Error('Failed to fetch circuit breaker status');
        return res.json();
    }

    async resetCircuitBreaker(connectorId: string): Promise<{ success: boolean; message: string }> {
        const res = await fetch('/api/automations/circuit-breaker/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectorId })
        });
        if (!res.ok) throw new Error('Failed to reset circuit breaker');
        return res.json();
    }
}

export const controlService = new ControlService();
