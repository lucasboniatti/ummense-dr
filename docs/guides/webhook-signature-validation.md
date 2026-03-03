# Webhook Signature Validation Guide

**Document:** Webhook Security & Signature Verification
**Story:** 3.2 - Webhook Reliability & Retry Logic
**Last Updated:** 2026-03-02

---

## Overview

All webhooks delivered by Synkra include cryptographic signatures that verify the payload authenticity and prevent tampering. As a webhook consumer, you **must** validate the signature for every webhook received to ensure it came from Synkra and hasn't been modified in transit.

## Security Importance

**Never trust a webhook without validating the signature.** An attacker could:
- Send fake webhook events to trigger unintended actions
- Modify payloads to inject malicious data
- Replay old webhooks to cause duplicate processing

Signature validation protects against these attacks.

---

## Signature Format

### Header: `X-Synkra-Signature`

Every Synkra webhook includes an `X-Synkra-Signature` header containing the HMAC-SHA256 hash of the request body.

```
X-Synkra-Signature: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e
```

**Format:** 64 hexadecimal characters (256-bit HMAC-SHA256)

### Other Headers

```
X-Synkra-Timestamp: 2026-03-02T14:30:00Z
Content-Type: application/json
User-Agent: Synkra/3.0
```

---

## Webhook Signature Algorithm

### How Signature is Generated (by Synkra)

```
signature = HMAC-SHA256(
  key = webhook_secret,
  message = JSON.stringify(payload)
)
output = hex(signature)
```

### How to Validate (your code)

1. Extract the request body as a **raw string** (before parsing JSON)
2. Get the webhook secret from your Synkra automation settings
3. Compute HMAC-SHA256 using the same secret and body
4. Compare the computed signature with `X-Synkra-Signature` header
5. **Use constant-time comparison** to prevent timing attacks

---

## Implementation Examples

### Node.js / TypeScript

```typescript
import crypto from 'crypto';
import express, { Request, Response } from 'express';

const app = express();

// CRITICAL: Use raw body middleware to preserve request body
app.use(express.raw({ type: 'application/json' }));

app.post('/webhooks/synkra', (req: Request, res: Response) => {
  const signature = req.headers['x-synkra-signature'] as string;
  const webhookSecret = process.env.SYNKRA_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature or secret' });
  }

  // Validate the signature
  const isValid = validateWebhookSignature(
    req.body as Buffer,
    signature,
    webhookSecret
  );

  if (!isValid) {
    console.error('Invalid webhook signature - rejecting request');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Signature valid - process webhook
  const payload = JSON.parse(req.body.toString());
  processWebhook(payload);

  res.json({ received: true });
});

/**
 * Validate webhook signature with constant-time comparison
 */
function validateWebhookSignature(
  body: Buffer | string,
  signature: string,
  secret: string
): boolean {
  // Ensure body is a string
  const bodyStr = typeof body === 'string' ? body : body.toString();

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(bodyStr)
    .digest('hex');

  // Constant-time comparison (prevent timing attacks)
  return constantTimeCompare(signature, expectedSignature);
}

/**
 * Constant-time string comparison
 * Prevents timing attacks by always comparing all characters
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

async function processWebhook(payload: any) {
  console.log('Processing valid webhook:', payload);
  // Your webhook processing logic here
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Python (Flask)

```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhooks/synkra', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Synkra-Signature')
    webhook_secret = os.environ.get('SYNKRA_WEBHOOK_SECRET')

    if not signature or not webhook_secret:
        return {'error': 'Missing signature or secret'}, 400

    # Get raw request body
    body = request.get_data()

    # Validate signature
    if not validate_webhook_signature(body, signature, webhook_secret):
        print('Invalid webhook signature - rejecting request')
        return {'error': 'Invalid signature'}, 401

    # Signature valid - process webhook
    payload = json.loads(body)
    process_webhook(payload)

    return {'received': True}, 200


def validate_webhook_signature(body: bytes, signature: str, secret: str) -> bool:
    """Validate webhook signature with constant-time comparison."""

    # Compute expected signature
    expected_signature = hmac.new(
        key=secret.encode(),
        msg=body,
        digestmod=hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(signature, expected_signature)


def process_webhook(payload):
    print(f'Processing valid webhook: {payload}')
    # Your webhook processing logic here


if __name__ == '__main__':
    app.run(port=3000)
```

### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
)

func handleWebhook(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-Synkra-Signature")
    webhookSecret := os.Getenv("SYNKRA_WEBHOOK_SECRET")

    if signature == "" || webhookSecret == "" {
        http.Error(w, "Missing signature or secret", http.StatusBadRequest)
        return
    }

    // Read raw request body
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Failed to read body", http.StatusBadRequest)
        return
    }

    // Validate signature
    if !validateWebhookSignature(body, signature, webhookSecret) {
        fmt.Println("Invalid webhook signature - rejecting request")
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Signature valid - process webhook
    var payload map[string]interface{}
    if err := json.Unmarshal(body, &payload); err != nil {
        http.Error(w, "Failed to parse JSON", http.StatusBadRequest)
        return
    }

    processWebhook(payload)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]bool{"received": true})
}

func validateWebhookSignature(body []byte, signature string, secret string) bool {
    // Compute expected signature
    h := hmac.New(sha256.New, []byte(secret))
    h.Write(body)
    expectedSignature := hex.EncodeToString(h.Sum(nil))

    // Constant-time comparison
    return hmac.Equal(
        []byte(signature),
        []byte(expectedSignature),
    )
}

func processWebhook(payload map[string]interface{}) {
    fmt.Printf("Processing valid webhook: %v\n", payload)
    // Your webhook processing logic here
}

func main() {
    http.HandleFunc("/webhooks/synkra", handleWebhook)
    fmt.Println("Webhook server running on port 3000")
    http.ListenAndServe(":3000", nil)
}
```

---

## Common Implementation Mistakes

### ❌ Don't Parse Request Body First

```typescript
// WRONG - loses raw body
app.use(express.json());
app.post('/webhooks', (req) => {
  // Can't access raw body anymore
  const signature = req.headers['x-synkra-signature'];
  // This won't work!
});
```

### ✅ Do Use Raw Body Middleware

```typescript
// CORRECT - preserves raw body
app.use(express.raw({ type: 'application/json' }));
app.post('/webhooks', (req) => {
  // req.body is still a Buffer
  const rawBody = req.body.toString();
  // Now you can validate the signature
});
```

### ❌ Don't Use Simple String Comparison

```typescript
// WRONG - vulnerable to timing attacks
if (signature === expectedSignature) {
  // An attacker can deduce the correct signature by measuring response time
}
```

### ✅ Do Use Constant-Time Comparison

```typescript
// CORRECT - prevents timing attacks
if (constantTimeCompare(signature, expectedSignature)) {
  // Takes same time regardless of where mismatch occurs
}
```

---

## Testing Your Implementation

### Test with cURL

```bash
# Create test payload
PAYLOAD='{"event":"automation.completed","executionId":"test-123"}'
SECRET="your-webhook-secret"

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)

# Send webhook
curl -X POST http://localhost:3000/webhooks/synkra \
  -H "Content-Type: application/json" \
  -H "X-Synkra-Signature: $SIGNATURE" \
  -H "X-Synkra-Timestamp: 2026-03-02T14:30:00Z" \
  -d "$PAYLOAD"
```

### Test with Invalid Signature

```bash
# Use wrong signature - should be rejected
curl -X POST http://localhost:3000/webhooks/synkra \
  -H "Content-Type: application/json" \
  -H "X-Synkra-Signature: invalid_signature_abc123" \
  -H "X-Synkra-Timestamp: 2026-03-02T14:30:00Z" \
  -d '{"event":"test"}'

# Expected: 401 Unauthorized
```

---

## Troubleshooting

### Signature Mismatch

**Problem:** Signature validation always fails

**Solutions:**
1. Ensure you're using the **raw request body** (before JSON parsing)
2. Verify the webhook secret matches exactly (check for whitespace, encoding)
3. Check that the secret is base64-encoded if applicable
4. Ensure you're using **SHA256**, not SHA1 or other algorithms

### Timestamp Verification

Synkra includes `X-Synkra-Timestamp` for optional replay protection:

```typescript
function isRecentWebhook(timestamp: string, maxAgeSeconds: number = 300): boolean {
  const webhookTime = new Date(timestamp).getTime();
  const currentTime = new Date().getTime();
  const ageSeconds = (currentTime - webhookTime) / 1000;

  return ageSeconds <= maxAgeSeconds;
}
```

---

## Security Checklist

- ✅ Always validate webhook signatures
- ✅ Use constant-time comparison
- ✅ Preserve raw request body before JSON parsing
- ✅ Use the correct webhook secret (never hardcode)
- ✅ Implement optional timestamp verification for replay protection
- ✅ Log signature validation failures (without exposing secrets)
- ✅ Return HTTP 401 for invalid signatures
- ✅ Never expose webhook secrets in logs or error messages

---

## Additional Resources

- [HMAC-SHA256 RFC 4868](https://tools.ietf.org/html/rfc4868)
- [Constant-Time Comparison](https://codahale.com/a-lesson-in-timing-attacks/)
- [OWASP: Webhook Security](https://owasp.org/www-community/attacks/xsrf)

---

## Support

For questions about webhook signature validation, contact support@synkra.com
