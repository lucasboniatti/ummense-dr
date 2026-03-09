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

import { apiClient } from './api.client';

class ControlService {
    async fetchQueueStatus(): Promise<QueueMetrics> {
        const { data } = await apiClient.get<QueueMetrics>('/status/queue');
        return data;
    }

    async pauseQueue(): Promise<{ success: boolean; message: string }> {
        const { data } = await apiClient.post<{ success: boolean; message: string }>('/automations/queue/pause');
        return data;
    }

    async resumeQueue(): Promise<{ success: boolean; message: string }> {
        const { data } = await apiClient.post<{ success: boolean; message: string }>('/automations/queue/resume');
        return data;
    }

    async clearQueue(): Promise<{ success: boolean; message: string }> {
        const { data } = await apiClient.post<{ success: boolean; message: string }>('/automations/queue/clear');
        return data;
    }

    async fetchCircuitBreaker(connectorId: string): Promise<CircuitBreakerState> {
        const { data } = await apiClient.get<CircuitBreakerState>(`/automations/circuit-breaker/${connectorId}`);
        return data;
    }

    async resetCircuitBreaker(connectorId: string): Promise<{ success: boolean; message: string }> {
        const { data } = await apiClient.post<{ success: boolean; message: string }>('/automations/circuit-breaker/reset', { connectorId });
        return data;
    }
}

export const controlService = new ControlService();
