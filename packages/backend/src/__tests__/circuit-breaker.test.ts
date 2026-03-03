import { CircuitBreakerService } from '../automations/circuit-breaker/circuit-breaker.service';

describe('CircuitBreakerService', () => {
    let circuitBreaker: CircuitBreakerService;

    beforeEach(() => {
        circuitBreaker = new CircuitBreakerService();
        // Use fake timers to control Date.now() if needed, but for simplicity we rely on manual manipulation where possible
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should start in a healthy state', () => {
        const connectorId = 'test-connector';
        const state = circuitBreaker.getState(connectorId);

        expect(state.state).toBe('healthy');
        expect(state.failureCount).toBe(0);
    });

    it('should transition to offline state after 5 consecutive failures', async () => {
        const connectorId = 'test-connector';

        // 4 failures should keep it healthy
        for (let i = 0; i < 4; i++) {
            await circuitBreaker.recordFailure(connectorId);
        }
        expect(circuitBreaker.getState(connectorId).state).toBe('healthy');
        expect(await circuitBreaker.isCircuitOpen(connectorId)).toBe(false);

        // 5th failure trips it
        const finalState = await circuitBreaker.recordFailure(connectorId);
        expect(finalState.state).toBe('offline');
        expect(finalState.failureCount).toBe(5);
        expect(await circuitBreaker.isCircuitOpen(connectorId)).toBe(true);
    });

    it('should reset failure count when a success is recorded', async () => {
        const connectorId = 'test-connector';

        // 3 failures
        for (let i = 0; i < 3; i++) {
            await circuitBreaker.recordFailure(connectorId);
        }
        expect(circuitBreaker.getState(connectorId).failureCount).toBe(3);

        // 1 success
        await circuitBreaker.recordSuccess(connectorId);

        expect(circuitBreaker.getState(connectorId).state).toBe('healthy');
        expect(circuitBreaker.getState(connectorId).failureCount).toBe(0);
    });

    it('should handle exponential backoff logic', async () => {
        const connectorId = 'test-connector';

        // Trip it initially (5 failures)
        for (let i = 0; i < 5; i++) {
            await circuitBreaker.recordFailure(connectorId);
        }

        // Should be open
        expect(await circuitBreaker.isCircuitOpen(connectorId)).toBe(true);

        // Fast forward 61 seconds (first backoff is 60s)
        jest.advanceTimersByTime(61000);

        // Circuit should transition to 'degraded' (half-open) allowing the next request
        expect(await circuitBreaker.isCircuitOpen(connectorId)).toBe(false);
        expect(circuitBreaker.getState(connectorId).state).toBe('degraded');
    });

    it('should allow manual reset of circuit breaker', async () => {
        const connectorId = 'test-connector';

        // Trip it (5 failures)
        for (let i = 0; i < 5; i++) {
            await circuitBreaker.recordFailure(connectorId);
        }
        expect(circuitBreaker.getState(connectorId).state).toBe('offline');

        // Manual reset
        await circuitBreaker.resetCircuit(connectorId);
        expect(circuitBreaker.getState(connectorId).state).toBe('healthy');
        expect(circuitBreaker.getState(connectorId).failureCount).toBe(0);
        expect(await circuitBreaker.isCircuitOpen(connectorId)).toBe(false);
    });
});
