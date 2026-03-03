/**
 * SignatureService - HMAC-SHA256 webhook signature generation and validation
 * Story 3.2: Webhook Reliability & Retry Logic - AC#5
 */

import { createHmac } from 'crypto';

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * Used to verify payload authenticity at destination
 */
export function generateSignature(payload: Record<string, unknown>, secret: string): string {
  const payloadStr = JSON.stringify(payload);
  const signature = createHmac('sha256', secret)
    .update(payloadStr)
    .digest('hex');
  return signature;
}

/**
 * Validate webhook signature
 * Destination systems should use this to verify payload authenticity
 *
 * IMPORTANT: Use constant-time comparison to prevent timing attacks
 */
export function validateSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(signature, expectedSignature);
}

/**
 * Constant-time string comparison
 * Prevents timing attacks by comparing all characters even after mismatch
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

/**
 * Build webhook delivery headers with signature
 */
export function buildWebhookHeaders(signature: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Synkra-Signature': signature,
    'X-Synkra-Timestamp': new Date().toISOString(),
    'User-Agent': 'Synkra/3.0'
  };
}
