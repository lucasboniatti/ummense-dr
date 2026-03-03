# Rate Limiting, Concurrency & Circuit Breaker Guide

This guide details the implementation and platform operation procedures for the Rate Limiting and Circuit Breaker feature configured for Epic 3.6 Wave 3.

## Rate Limiting Architecture

The rate limiting infrastructure is governed by **ConnectorRateLimiter**. It uses the Token Bucket algorithm (via `rate-limiter-flexible`) to limit Requests Per Second (RPS).

1. **Per-Connector Limits**: Distinct limitations are isolated by `connectorId` (e.g., Slack, Custom Webhooks).
2. **Global Concurrency Restrictions**: Total processing concurrent executions are globally capped via the Bull queue queue counting. 

## Queue Implementation

Execution payload requests interact with a robust **Bull-based queue**:

- **Location:** `packages/backend/src/automations/queue/`
- **FIFO Ordered Processing**: Limits queue processing concurrently so starvation is avoided and backpressure natively limits excessive incoming demands.
- **Controls**: The ExecutionQueue offers active toggles for Play/Pause states and clearing mechanisms.

### Circuit Breakers

Circuit breakers halt requests destined to a persistently failing integration resource. They ensure bad endpoints or dependencies do not repeatedly penalize the platform's stability.

#### States:
- **`healthy`**: Request passes through normally.
- **`degraded`** (Half-Open): Used briefly to test next retries. 
- **`offline`** (Open): Throws early failures to save on waiting/connection timeouts. Uses exponential backoff to occasionally test endpoints (1m, 5m, 15m, 1h).

If you are an admin and need to reset the connector early, you can Force Reset it via the Circuit Breaker Panel (`/admin/circuit-breaker`).

## Quick Navigation for UI

- Queue Health & Status: Access via `QueueMetricsDisplay` logic or Dashboard.
- Adjust Rate Limits settings: Access the `RateLimitsPanel`.

## Tests

To test the complete integration locally:
```bash
npx jest --testPathPattern=execution-queue.integration
npx jest --testPathPattern=circuit-breaker
npx jest --testPathPattern=rate-limiter
```
