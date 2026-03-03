import { ConnectorRateLimiter } from '../automations/rate-limiter/rate-limiter.service';

describe('ConnectorRateLimiter', () => {
    let rateLimiter: ConnectorRateLimiter;

    beforeEach(() => {
        // 5 Requests per second, 10 concurrent
        rateLimiter = new ConnectorRateLimiter(5, 10);
    });

    it('should allow requests under the limit', async () => {
        const connectorId = 'test-connector-1';

        // First 5 should succeed
        for (let i = 0; i < 5; i++) {
            const result = await rateLimiter.checkLimit(connectorId);
            expect(result.allowed).toBe(true);
        }
    });

    it('should block requests over the limit and provide wait time', async () => {
        const connectorId = 'test-connector-2';

        // Consume quota
        for (let i = 0; i < 5; i++) {
            await rateLimiter.checkLimit(connectorId);
        }

        // 6th request should fail
        const result = await rateLimiter.checkLimit(connectorId);
        expect(result.allowed).toBe(false);
        expect(result.waitMs).toBeGreaterThan(0);
        expect(result.waitMs).toBeLessThanOrEqual(1000);
    });

    it('should respect custom limits set for specific connectors', async () => {
        const connectorId = 'custom-connector';
        // Set limit to 2 RPS
        await rateLimiter.setLimit(connectorId, 2, 5);

        // 1st request OK
        expect((await rateLimiter.checkLimit(connectorId)).allowed).toBe(true);
        // 2nd request OK
        expect((await rateLimiter.checkLimit(connectorId)).allowed).toBe(true);

        // 3rd request FAIL
        const result = await rateLimiter.checkLimit(connectorId);
        expect(result.allowed).toBe(false);
        expect(result.waitMs).toBeGreaterThan(0);
    });

    it('should preserve isolation between different connectors', async () => {
        const connectorA = 'connector-A';
        const connectorB = 'connector-B';

        // Exhaust connector A
        for (let i = 0; i < 5; i++) {
            await rateLimiter.checkLimit(connectorA);
        }

        // Connector A is blocked
        expect((await rateLimiter.checkLimit(connectorA)).allowed).toBe(false);

        // Connector B should still be allowed
        expect((await rateLimiter.checkLimit(connectorB)).allowed).toBe(true);
    });
});
