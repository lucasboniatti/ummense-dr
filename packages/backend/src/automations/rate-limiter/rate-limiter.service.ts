import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

export interface RateLimitStatus {
    allowed: boolean;
    waitMs?: number;
}

export class ConnectorRateLimiter {
    private limiters: Map<string, RateLimiterMemory> = new Map();

    constructor(
        private defaultRPS: number = 10,
        private defaultConcurrent: number = 20
    ) { }

    /**
     * Check if a request for a specific connector is allowed according to its rate limit
     */
    async checkLimit(connectorId: string): Promise<RateLimitStatus> {
        let limiter = this.limiters.get(connectorId);
        if (!limiter) {
            // Create a default limiter for this connector if one doesn't exist
            limiter = new RateLimiterMemory({
                points: this.defaultRPS,
                duration: 1 // 1 second
            });
            this.limiters.set(connectorId, limiter);
        }

        try {
            await limiter.consume(1); // Consume 1 point
            return { allowed: true };
        } catch (rateLimiterRes: unknown) {
            const res = rateLimiterRes as RateLimiterRes;
            // Rate limit exceeded - return required wait time
            return {
                allowed: false,
                waitMs: Math.ceil(res.msBeforeNext)
            };
        }
    }

    /**
     * Configure specific rate limits for a connector
     */
    async setLimit(connectorId: string, rps: number, concurrent: number): Promise<void> {
        const newLimiter = new RateLimiterMemory({
            points: rps,
            duration: 1
        });

        this.limiters.set(connectorId, newLimiter);

        // In a real implementation we would persist this to the DB:
        // await db('connector_rate_limits').update({
        //   rps,
        //   concurrent,
        //   updated_at: new Date()
        // }).where({ connector_id: connectorId });
    }

    /**
     * Get current limits for a connector
     */
    getLimit(connectorId: string): { rps: number; concurrent: number } {
        const limiter = this.limiters.get(connectorId);
        if (!limiter) {
            return { rps: this.defaultRPS, concurrent: this.defaultConcurrent };
        }
        return {
            rps: limiter.points,
            concurrent: this.defaultConcurrent // Concurrency is handled separately by the execution queue
        };
    }
}

// Export singleton instance
export const rateLimiter = new ConnectorRateLimiter();
