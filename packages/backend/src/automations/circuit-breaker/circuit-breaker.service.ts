export interface CircuitBreakerState {
    connectorId: string;
    failureCount: number;
    state: 'healthy' | 'degraded' | 'offline';
    lastFailureAt?: Date;
    nextRetryAt?: Date;
}

export class CircuitBreakerService {
    private states = new Map<string, CircuitBreakerState>();
    private failureThreshold = 5;
    private backoffIntervals = [60000, 300000, 900000, 3600000]; // 1m, 5m, 15m, 1h (ms)

    constructor() { }

    /**
     * Record a failure for a specific connector
     */
    async recordFailure(connectorId: string): Promise<CircuitBreakerState> {
        const defaultState: CircuitBreakerState = {
            connectorId,
            failureCount: 0,
            state: 'healthy'
        };

        let state = this.states.get(connectorId) || defaultState;

        state.failureCount += 1;
        state.lastFailureAt = new Date();

        if (state.failureCount >= this.failureThreshold) {
            state.state = 'offline';

            const backoffLevel = Math.min(
                state.failureCount - this.failureThreshold,
                this.backoffIntervals.length - 1
            );

            state.nextRetryAt = new Date(Date.now() + this.backoffIntervals[backoffLevel]);
        }

        this.states.set(connectorId, state);

        // In a real implementation we would persist this to the DB:
        // await db('circuit_breaker_states').insert(state).onConflict('connector_id').merge();

        return state;
    }

    /**
     * Record a success for a specific connector (healthy)
     */
    async recordSuccess(connectorId: string): Promise<void> {
        const state = this.states.get(connectorId);
        if (state) {
            state.failureCount = 0;
            state.state = 'healthy';
            state.nextRetryAt = undefined;
            state.lastFailureAt = undefined;

            this.states.set(connectorId, state);

            // await db('circuit_breaker_states').update(state);
        }
    }

    /**
     * Check if a connector's circuit is open (requests should NOT proceed)
     */
    async isCircuitOpen(connectorId: string): Promise<boolean> {
        const state = this.states.get(connectorId);

        // Default is healthy
        if (!state || state.state === 'healthy') return false;

        // Check if it's offline but time for a retry
        if (state.state === 'offline' && state.nextRetryAt && new Date() >= state.nextRetryAt) {
            // Time to retry - close circuit temporarily (half-open)
            console.log(`[CircuitBreaker] Connector ${connectorId} transitioning from offline to degraded logic for retry`);
            state.state = 'degraded';
            this.states.set(connectorId, state);
            return false;
        }

        // It's offline and NOT yet time to retry (circuit is open)
        return state.state === 'offline';
    }

    /**
     * Force reset a circuit manually
     */
    async resetCircuit(connectorId: string): Promise<void> {
        const state = this.states.get(connectorId);
        if (state) {
            state.failureCount = 0;
            state.state = 'healthy';
            state.nextRetryAt = undefined;
            this.states.set(connectorId, state);
            // await db('circuit_breaker_states').update(state);
        }
    }

    /**
     * Get current state of a connector circuit
     */
    getState(connectorId: string): CircuitBreakerState {
        return this.states.get(connectorId) || {
            connectorId,
            failureCount: 0,
            state: 'healthy'
        };
    }
}

// Export singleton instance
export const circuitBreaker = new CircuitBreakerService();
