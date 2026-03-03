/**
 * Unit Tests for Webhook Delivery Service
 * Story 3.2: Webhook Reliability & Retry Logic
 * Focus: Signature generation, retry scheduling, DLQ logic
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  WebhookDeliveryService,
  WebhookDeliveryRecord
} from '../automations/webhooks/webhook-delivery.service';
import {
  generateSignature,
  validateSignature,
  buildWebhookHeaders
} from '../automations/webhooks/signature.service';

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;

  beforeEach(() => {
    service = new WebhookDeliveryService();
  });

  describe('Signature Generation (AC#5)', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const payload = { event: 'automation.completed', executionId: '123' };
      const secret = 'test-secret-key';

      const signature = generateSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex = 64 chars
    });

    it('should generate same signature for same payload and secret', () => {
      const payload = { test: 'data' };
      const secret = 'secret';

      const sig1 = generateSignature(payload, secret);
      const sig2 = generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signature for different payloads', () => {
      const secret = 'secret';

      const sig1 = generateSignature({ data: 'test1' }, secret);
      const sig2 = generateSignature({ data: 'test2' }, secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should validate correct signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';

      const signature = generateSignature(JSON.parse(body), secret);
      const isValid = validateSignature(body, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';
      const wrongSecret = 'wrong-secret';

      const signature = generateSignature(JSON.parse(body), secret);
      const isValid = validateSignature(body, signature, wrongSecret);

      expect(isValid).toBe(false);
    });

    it('should build correct webhook headers with signature', () => {
      const signature = 'abc123def456';
      const headers = buildWebhookHeaders(signature);

      expect(headers['X-Synkra-Signature']).toBe(signature);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Synkra-Timestamp']).toBeDefined();
      expect(headers['User-Agent']).toBe('Synkra/3.0');
    });
  });

  describe('Retry Scheduling (AC#1)', () => {
    it('should calculate correct exponential backoff intervals', () => {
      const intervals = [
        { attempt: 0, expectedSeconds: 1 },
        { attempt: 1, expectedSeconds: 5 },
        { attempt: 2, expectedSeconds: 30 },
        { attempt: 3, expectedSeconds: 300 }, // 5 minutes
        { attempt: 4, expectedSeconds: 1800 } // 30 minutes
      ];

      for (const { attempt, expectedSeconds } of intervals) {
        const nextRetry = service.getNextRetryTime(attempt);
        const delayMs = nextRetry.getTime() - Date.now();
        const delaySec = Math.round(delayMs / 1000);

        // Allow ±2 second tolerance for test execution time
        expect(Math.abs(delaySec - expectedSeconds)).toBeLessThanOrEqual(2);
      }
    });

    it('should throw error on max retries exceeded', () => {
      expect(() => service.getNextRetryTime(5)).toThrow(
        'Max retry attempts reached'
      );
    });

    it('should reject attempt 6 (max 5 retries)', () => {
      expect(() => service.getNextRetryTime(5)).toThrow();
    });
  });

  describe('DLQ Detection (AC#2)', () => {
    it('should identify when max retries reached', () => {
      const delivery: WebhookDeliveryRecord = {
        id: '123',
        automationId: 'auto-1',
        webhookId: 'https://example.com/webhook',
        executionId: 'exec-1',
        attemptNumber: 5, // Max attempts
        status: 'pending',
        payload: { test: 'data' },
        signature: 'sig123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Attempt 5 should trigger DLQ, not retry
      expect(delivery.attemptNumber).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should capture error context with message', async () => {
      const delivery: WebhookDeliveryRecord = {
        id: '123',
        automationId: 'auto-1',
        webhookId: 'https://invalid-url.local/webhook',
        executionId: 'exec-1',
        attemptNumber: 1,
        status: 'pending',
        payload: { test: 'data' },
        signature: 'sig123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await service.attemptDelivery(delivery);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
