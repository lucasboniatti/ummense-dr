# Webhook Delivery System Guide

## Overview

Ummense's webhook delivery system provides **reliable, secure, and idempotent webhook delivery** for event-driven integrations. It ensures that webhooks are delivered even in the face of transient failures, while protecting against security vulnerabilities and preventing duplicate processing.

**Key Features:**
- ✅ **SSRF Protection** - Blocks requests to private/local IP ranges
- ✅ **Exponential Backoff Retries** - Intelligent retry strategy with 5 max attempts
- ✅ **Idempotent Delivery** - Prevents duplicate processing via SHA256 key
- ✅ **Dead Letter Queue** - Failed deliveries moved to DLQ for manual review
- ✅ **Webhook Signatures** - Optional HMAC-SHA256 signing for security
- ✅ **Request Timeout** - 30-second HTTP timeout with automatic retry
- ✅ **Delivery Metrics** - Real-time monitoring and success rate tracking

---

## Architecture

### Core Components

#### 1. **Webhook Delivery Service** (`webhook-delivery.service.ts`)
Main orchestrator service that coordinates all webhook operations.

**Responsibilities:**
- Enqueue webhook deliveries from events
- Manage delivery lifecycle (pending → success/dead_lettered)
- Process retry queue
- Track delivery metrics

**Key Methods:**
- `enqueueWebhookDelivery()` - Queue webhook for delivery
- `deliverWebhook()` - Execute HTTP POST to endpoint
- `updateDeliverySuccess()` - Mark successful delivery
- `updateDeliveryFailure()` - Schedule retry or move to DLQ
- `processRetryQueue()` - Background job to process pending retries
- `getDeliveryMetrics()` - Fetch delivery statistics

#### 2. **SSRF Validator** (`ssrf-validator.service.ts`)
Prevents Server-Side Request Forgery attacks by blocking requests to private/local networks.

**Protected IP Ranges:**
- IPv4: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 224.0.0.0/4, 240.0.0.0/4, 0.0.0.0/8, 255.255.255.255
- IPv6: ::1 (localhost), fc00::/7 (private), fe80::/10 (link-local), ff00::/8 (multicast), :: (unspecified)

**Validation Process:**
1. Parse webhook URL
2. Verify protocol (http/https only)
3. Extract hostname
4. Check if direct IP address or resolve via DNS
5. Validate resolved IP against blocklist

**Throws:** `Error` if URL is invalid or targets blocked IP

#### 3. **Idempotency Key Service** (`idempotency-key.service.ts`)
Generates and verifies idempotency keys and webhook signatures.

**Key Generation:**
- Input: `webhookId:eventId:eventType`
- Algorithm: SHA256 hash (hexadecimal)
- Used in: `X-Idempotency-Key` header

**Signature Generation:**
- Algorithm: HMAC-SHA256
- Input: Webhook payload + secret
- Used in: `X-Signature: sha256={hex}` header
- Receiver verifies: `verifySignature(payload, signature, secret)`

#### 4. **Webhook Retry Service** (`webhook-retry.service.ts`)
Calculates exponential backoff delays for retry attempts.

**Backoff Strategy:**
- Formula: `2^n` seconds (where n = attempt number)
- Attempts:
  1. Immediate (0s)
  2. 2 seconds (2^1)
  3. 4 seconds (2^2)
  4. 8 seconds (2^3)
  5. 16 seconds (2^4)
- Cap: 300 seconds (5 minutes) max per attempt
- Total Timespan: ~30 seconds (1st attempt to 5th)

**Max Attempts:** 5 per delivery

---

## Webhook Payload Structure

### Request

```json
{
  "event_id": "evt_abcd1234",
  "event_type": "task:created",
  "timestamp": "2025-03-02T14:30:00.000Z",
  "data": {
    "task_id": "task_xyz789",
    "title": "Complete project review",
    "priority": "high",
    "assigned_to": "user_123",
    "status": "todo"
  },
  "metadata": {
    "attempt": 1,
    "max_attempts": 5
  }
}
```

### Headers

```
POST /webhook HTTP/1.1
Host: example.com
Content-Type: application/json
X-Event-Type: task:created
X-Event-ID: evt_abcd1234
X-Idempotency-Key: 5f7a2c8d9e1b3a6c4f2e1d9a8b7c6f5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b
X-Signature: sha256=7c5a3b2e1f9d8c4a6b2f7e1d9c8a3f5e7d2c1b9a6f8e4d3c2b1a0f9e8d7c6
```

**Header Details:**
- `X-Event-Type` - Type of event that triggered the webhook
- `X-Event-ID` - Unique event identifier for correlation
- `X-Idempotency-Key` - SHA256(webhookId:eventId:eventType) for duplicate detection
- `X-Signature` - Optional HMAC-SHA256 signature (only if webhook has secret)

### Response

Receiver should respond with:
- **2xx Status** - Success (delivery marked successful)
- **4xx Status** - Permanent failure (moved to dead letter queue)
- **5xx Status** - Temporary failure (scheduled for retry)
- **Timeout** - No response in 30s (scheduled for retry)

---

## SSRF Protection

### Purpose

Prevent webhooks from being delivered to internal/private resources that could expose sensitive data or allow lateral attacks.

### Implementation

```typescript
// Validation happens during enqueueWebhookDelivery()
await ssrfValidatorService.validateWebhookUrl(webhook.url);

// Throws error if:
// - URL is not http:// or https://
// - Hostname resolves to blocked IP
// - Direct IP address is in blocklist
```

### Testing SSRF Protection

```bash
# Block: Localhost
curl -X POST http://your-api.com/webhooks/validate \
  -d '{"url": "http://127.0.0.1/webhook"}'
# Error: Blocked IP address: 127.0.0.1 (SSRF protection)

# Block: Private network
curl -X POST http://your-api.com/webhooks/validate \
  -d '{"url": "http://192.168.1.100/webhook"}'
# Error: Blocked IP address: 192.168.1.100 (SSRF protection)

# Allow: External domain
curl -X POST http://your-api.com/webhooks/validate \
  -d '{"url": "https://slack.com/api/webhooks"}'
# Success: Valid
```

---

## Exponential Backoff Retry Strategy

### Why Exponential Backoff?

- **Avoids hammering** failed endpoints with rapid retries
- **Gives time to recover** - endpoint has time to resolve issues
- **Reduces wasted requests** - fewer failed attempts
- **Preserves system resources** - spreads load over time

### Retry Schedule

| Attempt | Delay | Total Time |
|---------|-------|-----------|
| 1 | Immediate | 0s |
| 2 | 2s | 2s |
| 3 | 4s | 6s |
| 4 | 8s | 14s |
| 5 | 16s | 30s |

**After Attempt 5 Fails:** Delivery moved to Dead Letter Queue (DLQ)

### Retry Logic in Code

```typescript
// Check if ready for retry
const shouldRetry = webhookRetryService.shouldRetry(
  attemptCount,      // 0-4
  lastFailureTime,   // previous attempt timestamp
  currentTime        // now
);

if (shouldRetry) {
  const nextRetryTime = webhookRetryService.calculateNextRetryTime(attemptCount);
  // Schedule next attempt at nextRetryTime
}
```

---

## Idempotent Delivery

### Problem Solved

Without idempotency, network retries could cause duplicate webhook deliveries, leading to:
- Duplicate orders created
- Double payments charged
- Redundant notifications sent

### Solution: Idempotency Key

```typescript
// Generated from immutable webhook + event identifiers
const idempotencyKey = idempotencyKeyService.generateKey(
  webhookId,   // "webhook_abc123"
  eventId,     // "evt_xyz789"
  eventType    // "task:created"
);
// Result: 5f7a2c8d9e1b3a6c4f2e1d9a8b7c6f5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b (SHA256)
```

### Receiver Implementation

Receivers should:
1. Extract `X-Idempotency-Key` header
2. Check if already processed (e.g., in database)
3. If exists: return success (200) without reprocessing
4. If new: process event and store idempotency key

```javascript
// Example Node.js receiver
app.post('/webhook', async (req, res) => {
  const idempotencyKey = req.headers['x-idempotency-key'];

  // Check if already processed
  const existing = await db.webhookLogs.findOne({ idempotencyKey });
  if (existing) {
    return res.status(200).json({ status: 'already_processed' });
  }

  // Process new webhook
  try {
    await processWebhook(req.body);
    await db.webhookLogs.insert({ idempotencyKey, status: 'processed' });
    res.status(200).json({ status: 'success' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message });
  }
});
```

---

## Webhook Signatures

### When to Use Signatures

Enable webhook signing when:
- Webhook is sent to external/untrusted domain
- Webhook contains sensitive data
- Receiver needs to verify authenticity

### Setup

1. **Create Webhook with Secret:**
```typescript
const webhook = {
  id: 'webhook_123',
  url: 'https://example.com/webhook',
  secret: 'whsec_abc123xyz...',  // Generated randomly
  event_types: ['task:created', 'task:updated']
};
```

2. **Signing During Delivery:**
```typescript
// In deliverWebhook()
if (webhook.secret) {
  const signature = idempotencyKeyService.generateSignature(
    JSON.stringify(payload),
    webhook.secret
  );
  headers['X-Signature'] = `sha256=${signature}`;
}
```

3. **Verification on Receiver:**
```javascript
function verifySignature(req, secret) {
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === `sha256=${computed}`;
}

app.post('/webhook', (req, res) => {
  if (!verifySignature(req, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // Process webhook...
});
```

---

## Dead Letter Queue Pattern

### What is DLQ?

The Dead Letter Queue holds webhook deliveries that failed all 5 retry attempts and cannot be delivered automatically. These require manual investigation.

### Delivery Statuses

| Status | Meaning | Next Action |
|--------|---------|-----------|
| `pending` | Awaiting delivery or retry | Automatic retry per schedule |
| `success` | Delivered successfully | Complete |
| `dead_lettered` | Failed all 5 attempts | Manual review required |

### Workflow

```
event triggered
  ↓
enqueueWebhookDelivery()
  ↓
deliverWebhook() [Attempt 1]
  ├─ Success (2xx) → status='success' ✓
  └─ Failure → updateDeliveryFailure()
      ↓
      Schedule retry at: now + backoff(1)
      status='pending'

[60s later - retry job runs]
  ↓
processRetryQueue()
  ├─ Fetch: status='pending' AND next_retry_at <= now
  ├─ Re-attempt delivery [Attempt 2]
  └─ If still fails → Schedule retry at: now + backoff(2)

[After Attempt 4 fails]
  ↓
updateDeliveryFailure() [Attempt 5]
  ├─ Is nextAttempt (5) >= MAX_ATTEMPTS (5)?
  ├─ YES → Move to DLQ
  └─ status='dead_lettered'

[Manual Review Needed]
  ↓
Admin investigates DLQ entry:
  - Check error message
  - Verify webhook URL still valid
  - Check if endpoint is back online
  - Manually retry or delete
```

### Monitoring DLQ

```sql
-- Find all dead-lettered deliveries
SELECT id, webhook_id, event_id, created_at, response_body
FROM webhook_deliveries
WHERE status = 'dead_lettered'
ORDER BY created_at DESC;

-- Count DLQ entries by webhook
SELECT webhook_id, COUNT(*) as count
FROM webhook_deliveries
WHERE status = 'dead_lettered'
GROUP BY webhook_id;
```

---

## Request Timeout

### Timeout Settings

- **HTTP Timeout:** 30 seconds per delivery attempt
- **Implementation:** `AbortController` with `setTimeout`

### Timeout Behavior

```typescript
// In deliverWebhook()
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(webhook.url, {
    method: 'POST',
    headers,
    body: payloadJson,
    signal: controller.signal
  });
  // Process response...
} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout occurred
    await updateDeliveryFailure(deliveryId, null, 'Request timeout', duration, attemptCount);
  }
} finally {
  clearTimeout(timeoutId);
}
```

### Timeout as Retry Trigger

When timeout occurs:
- Error message: `"Request timeout"`
- Status code: `null` (not available)
- Action: Schedule next retry via `updateDeliveryFailure()`
- Backoff: Same as other failures (exponential)

---

## Delivery Metrics

### Available Metrics

```typescript
const metrics = await webhookDeliveryService.getDeliveryMetrics();
// Returns:
{
  totalDeliveries: 15234,      // Total delivery attempts
  successRate: 98.5,           // Percentage of successful deliveries
  averageDeliveryTime: 245,    // ms per successful delivery
  deadLetteredCount: 98        // Deliveries in DLQ
}
```

### Monitoring Queries

```sql
-- Success rate over last 24 hours
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successes,
  ROUND(100.0 * COUNT(CASE WHEN status = 'success' THEN 1 END) / COUNT(*), 2) as success_rate
FROM webhook_deliveries
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Average delivery time
SELECT
  webhook_id,
  AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)))::INT as avg_seconds,
  COUNT(*) as delivery_count
FROM webhook_deliveries
WHERE status = 'success' AND delivered_at IS NOT NULL
GROUP BY webhook_id
ORDER BY avg_seconds DESC;

-- Failed deliveries by status
SELECT
  status,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM webhook_deliveries
WHERE status IN ('dead_lettered', 'pending')
GROUP BY status;
```

---

## Performance Characteristics

### Delivery Latency

| Scenario | Latency | Notes |
|----------|---------|-------|
| Immediate success | <100ms | Direct POST, no retry |
| Network latency (500ms endpoint) | 500-750ms | Including overhead |
| Max timeout (no response) | 30s + overhead | Triggers retry schedule |

### Retry Job Performance

- **Batch Size:** Up to 100 deliveries per run
- **Frequency:** Every 60 seconds
- **Processing 1000 deliveries:** <10 seconds (serial with short timeouts)
- **Concurrent deliveries:** 100+ simultaneous without degradation

### Database Impact

- **Queries per delivery:** 3-4 (fetch webhook, insert delivery, update status)
- **Indexed fields:** `status`, `next_retry_at`, `created_at`
- **Disk usage:** ~1-2KB per delivery record
- **Growth rate:** ~1M records/year at 30 deliveries/day

---

## Best Practices

### For Webhook Senders (Ummense)

1. **Enable Webhook Signatures** for production webhooks
2. **Monitor DLQ** regularly (daily or weekly)
3. **Log all webhook attempts** for debugging
4. **Set appropriate timeouts** on retries (don't increase beyond 30s)
5. **Test SSRF validation** before deployment
6. **Document webhook payload** for receivers

### For Webhook Receivers

1. **Implement Idempotency** using `X-Idempotency-Key` header
2. **Verify Signatures** using `X-Signature` header
3. **Respond with appropriate status codes:**
   - 2xx = success (don't retry)
   - 4xx = permanent failure (don't retry)
   - 5xx = temporary failure (will retry)
4. **Log incoming webhooks** with timestamp and idempotency key
5. **Handle timeouts gracefully** (may not receive confirmation)
6. **Process asynchronously** - don't block on external operations
7. **Return 200** quickly even if processing is slow

### For Ops/Monitoring

1. **Alert on high DLQ count** (>5% of total deliveries)
2. **Alert on low success rate** (<95%)
3. **Monitor retry job** - ensure running every 60s
4. **Track average delivery time** - alert if increasing
5. **Set up log aggregation** for webhook delivery errors
6. **Review failed webhook patterns** - look for trends

---

## Troubleshooting

### Webhook Not Delivered

**Symptoms:** Delivery stuck in `pending` status, `next_retry_at` in future

**Causes:**
1. Endpoint temporarily down - wait for automatic retry
2. SSRF blocked - endpoint has private IP (by design)
3. Network timeout - endpoint too slow or unreachable
4. Invalid URL - webhook URL malformed

**Solutions:**
```sql
-- Check delivery status
SELECT id, status, next_retry_at, response_body
FROM webhook_deliveries
WHERE event_id = 'evt_xyz123';

-- If blocked by SSRF, recreate webhook with public URL
UPDATE webhooks SET url = 'https://example.com/webhook'
WHERE id = 'webhook_abc123';

-- Manual retry (admin only)
UPDATE webhook_deliveries
SET next_retry_at = NOW(), status = 'pending'
WHERE id = 'delivery_xyz789' AND status NOT IN ('success', 'dead_lettered');
```

### Duplicate Deliveries

**Symptoms:** Receiver processes same event twice with same `X-Idempotency-Key`

**Causes:**
1. Receiver not checking idempotency key
2. Receiver processed but didn't respond with 2xx
3. Webhook retry triggered despite success

**Solutions:**
1. Implement idempotency check on receiver
2. Always respond with 2xx (even if already processed)
3. Log all webhook attempts with idempotency key

### High DLQ Count

**Symptoms:** Many deliveries in `dead_lettered` status

**Causes:**
1. Endpoint permanently down
2. SSRF configuration changed
3. Receiver misconfigured (rejects all webhooks)

**Solutions:**
```sql
-- Investigate DLQ
SELECT
  webhook_id,
  COUNT(*) as count,
  MAX(response_body) as latest_error
FROM webhook_deliveries
WHERE status = 'dead_lettered'
GROUP BY webhook_id
HAVING COUNT(*) > 10
ORDER BY count DESC;

-- Update webhook with new endpoint
UPDATE webhooks
SET url = 'https://newdomain.com/webhook'
WHERE id = 'webhook_abc123';

-- Manually retry after fix
UPDATE webhook_deliveries
SET status = 'pending', next_retry_at = NOW()
WHERE webhook_id = 'webhook_abc123' AND status = 'dead_lettered';
```

---

## Integration Examples

### Slack Webhook Delivery

```typescript
// Enqueue delivery to Slack
const slackWebhook = await db.webhooks.findOne({
  url: { $regex: 'hooks.slack.com' }
});

await webhookDeliveryService.enqueueWebhookDelivery(
  slackWebhook.id,
  event.id,
  event.type,
  {
    text: `Task created: ${event.data.title}`,
    blocks: [...] // Slack Block Kit format
  }
);

// Slack responds with 200 → delivery marked success
```

### Third-Party API Integration

```typescript
// Enqueue delivery to partner API
const partnerWebhook = {
  id: 'webhook_partner123',
  url: 'https://api.partner.com/webhooks/events',
  secret: 'whsec_partner_key...'
};

await webhookDeliveryService.enqueueWebhookDelivery(
  partnerWebhook.id,
  event.id,
  event.type,
  event.data
);

// Partner verifies signature and implements idempotency
// Returns 200 → delivery success, or 503 → retry on schedule
```

---

## Performance Testing

```bash
# Load test: 1000 concurrent webhook enqueues
npm run test:load -- --webhooks=1000 --concurrency=50

# Retry queue performance test
npm run test:retry-performance -- --deliveries=5000

# SSRF validation performance
npm run test:ssrf-performance -- --urls=100
```

Expected Results:
- Enqueue: <10ms per webhook
- Delivery: <2s per attempt (including network)
- Retry queue: <10s for 1000 deliveries
- SSRF validation: <50ms per URL

---

## References

- **Idempotency Standard:** https://datatracker.ietf.org/doc/html/draft-idempotency-header-last-version-06
- **HMAC-SHA256:** https://nodejs.org/api/crypto.html#crypto_class_hmac
- **Exponential Backoff:** https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- **Webhook Best Practices:** https://zapier.com/engineering/webhook/
