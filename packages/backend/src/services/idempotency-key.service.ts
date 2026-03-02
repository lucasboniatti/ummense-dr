import { createHash } from 'crypto';

/**
 * Idempotency Key Service
 * Generates and manages idempotency keys for webhook delivery
 * Prevents duplicate processing of the same webhook event
 */
export class IdempotencyKeyService {
  /**
   * Generate idempotency key from webhook and event identifiers
   * @param webhookId Unique webhook identifier
   * @param eventId Unique event identifier
   * @param eventType Event type (e.g., "task:created")
   * @returns SHA256 hash of the combination
   */
  generateKey(webhookId: string, eventId: string, eventType: string): string {
    const combined = `${webhookId}:${eventId}:${eventType}`;
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * @param payload JSON payload to sign
   * @param secret Webhook secret key
   * @returns HMAC-SHA256 signature
   */
  generateSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature
   * @param payload Original payload
   * @param signature Provided signature
   * @param secret Webhook secret
   * @returns true if signature is valid
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return expectedSignature === signature;
  }
}

export const idempotencyKeyService = new IdempotencyKeyService();
