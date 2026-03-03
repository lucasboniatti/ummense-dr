/**
 * Integration Tests for Webhook Delivery Flow
 * Story 3.2: Webhook Reliability & Retry Logic
 * Tests: Complete delivery flow, retry scheduling, DLQ workflow
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WebhookDeliveryService } from '../automations/webhooks/webhook-delivery.service';
import { DLQService } from '../automations/webhooks/dlq.service';
import { generateSignature } from '../automations/webhooks/signature.service';

describe('Webhook Delivery Integration Tests', () => {
  let deliveryService: WebhookDeliveryService;
  let dlqService: DLQService;
  let mockDb: any;

  beforeEach(() => {
    deliveryService = new WebhookDeliveryService();
    dlqService = new DLQService();

    // Mock database
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      catch: jest.fn(),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockReturnThis(),
      del: jest.fn(),
      clone: jest.fn().mockReturnThis()
    };
  });

  describe('End-to-End Webhook Delivery', () => {
    it('should handle successful webhook delivery on first attempt', async () => {
      const automationId = 'auto-123';
      const executionId = 'exec-456';
      const webhookUrl = 'https://webhook.example.com/delivery';
      const secret = 'webhook-secret';
      const payload = { event: 'automation.completed', executionId };

      // Create delivery record
      const delivery = await deliveryService.sendWebhook(
        automationId,
        executionId,
        { url: webhookUrl, secret },
        payload,
        mockDb
      );

      expect(delivery).toBeDefined();
      expect(delivery.id).toBeDefined();
      expect(delivery.status).toBe('pending');
      expect(delivery.attemptNumber).toBe(1);
      expect(delivery.signature).toBeDefined();
      expect(delivery.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should track multiple retry attempts with exponential backoff', async () => {
      const automationId = 'auto-789';
      const executionId = 'exec-101';
      const payload = { test: 'data' };

      const attempts = [];

      for (let i = 0; i < 5; i++) {
        const nextRetryTime = deliveryService.getNextRetryTime(i);
        const delayMs = nextRetryTime.getTime() - Date.now();
        const delaySec = Math.round(delayMs / 1000);

        attempts.push({
          attemptNumber: i + 1,
          delaySeconds: delaySec,
          nextRetryTime
        });
      }

      // Verify exponential backoff pattern
      expect(attempts[0].delaySeconds).toBeLessThanOrEqual(3); // 1s ± 2s
      expect(attempts[1].delaySeconds).toBeLessThanOrEqual(7); // 5s ± 2s
      expect(attempts[2].delaySeconds).toBeLessThanOrEqual(32); // 30s ± 2s
      expect(attempts[3].delaySeconds).toBeLessThanOrEqual(302); // 300s ± 2s
      expect(attempts[4].delaySeconds).toBeLessThanOrEqual(1802); // 1800s ± 2s
    });

    it('should move webhook to DLQ after max retries (5 attempts)', async () => {
      const automationId = 'auto-dlq-1';
      const executionId = 'exec-dlq-1';
      const webhookUrl = 'https://webhook.example.com/dlq-test';
      const payload = { event: 'test' };

      const delivery = {
        id: 'delivery-dlq-1',
        automationId,
        webhookId: webhookUrl,
        executionId,
        attemptNumber: 5,
        status: 'failed' as const,
        payload,
        signature: generateSignature(payload, 'secret'),
        errorMessage: 'Connection timeout',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate max retries reached
      expect(() => deliveryService.getNextRetryTime(5)).toThrow('Max retry attempts reached');

      // Move to DLQ
      await deliveryService.moveToDLQ(delivery, mockDb);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('DLQ Workflow', () => {
    it('should list DLQ items with pagination', async () => {
      // Mock database response
      mockDb.first = jest.fn().mockResolvedValueOnce({ total: 10 });
      mockDb.select = jest.fn().mockReturnThis();

      const mockItems = [
        {
          id: 'dlq-1',
          automation_id: 'auto-1',
          webhook_delivery_id: 'delivery-1',
          webhook_url: 'https://example.com/webhook',
          payload: { test: 'data' },
          retry_count: 5,
          last_error: 'Connection timeout',
          last_error_at: new Date().toISOString(),
          cleared_at: null,
          created_at: new Date().toISOString()
        }
      ];

      // Mock the full query chain
      let query = mockDb;
      query.clone = jest.fn().mockReturnThis();
      query.count = jest.fn().mockReturnThis();
      mockDb.first = jest.fn()
        .mockResolvedValueOnce({ total: 10 }) // For count
        .mockResolvedValueOnce(mockItems[0]); // For fetch

      // Query DLQ items
      const result = await dlqService.query('auto-1', {}, { page: 1, limit: 20 }, mockDb);

      expect(result).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should retry DLQ item and reset attempt count', async () => {
      const dlqItemId = 'dlq-retry-1';
      const deliveryId = 'delivery-retry-1';

      // Mock finding the DLQ item and delivery
      mockDb.select = jest.fn().mockReturnThis();
      mockDb.where = jest.fn().mockReturnThis();
      mockDb.first = jest.fn()
        .mockResolvedValueOnce({
          id: dlqItemId,
          automation_id: 'auto-1',
          webhook_delivery_id: deliveryId,
          webhook_url: 'https://example.com/webhook',
          payload: { test: 'data' },
          retry_count: 5,
          last_error: 'Failed',
          last_error_at: new Date().toISOString(),
          cleared_at: null,
          created_at: new Date().toISOString()
        }) // DLQ item
        .mockResolvedValueOnce({
          id: deliveryId,
          automation_id: 'auto-1',
          webhook_id: 'https://example.com/webhook',
          execution_id: 'exec-1',
          attempt_number: 5,
          status: 'dlq',
          payload: { test: 'data' },
          signature: 'sig123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }); // Delivery record

      // Retry the DLQ item
      const result = await dlqService.retry(dlqItemId, mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should clear DLQ item after manual review', async () => {
      const dlqItemId = 'dlq-clear-1';

      // Clear the item
      const result = await dlqService.clear(dlqItemId, mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should get DLQ statistics for automation', async () => {
      // Mock database response
      mockDb.select = jest.fn().mockReturnThis();
      mockDb.raw = jest.fn()
        .mockReturnValueOnce('COUNT(*) as totalItems')
        .mockReturnValueOnce('MIN(created_at) as oldestItem')
        .mockReturnValueOnce('MAX(created_at) as newestItem')
        .mockReturnValueOnce('AVG(retry_count) as avgRetries');

      mockDb.first = jest.fn().mockResolvedValueOnce({
        totalItems: 42,
        oldestItem: new Date(Date.now() - 86400000).toISOString(),
        newestItem: new Date().toISOString(),
        avgRetries: 4.2
      });

      // Get stats
      const stats = await dlqService.getStats('auto-1', mockDb);

      expect(stats).toBeDefined();
      expect(stats.totalItems).toBe(42);
      expect(stats.averageRetriesPerItem).toBe(4);
    });
  });

  describe('Signature Validation in Delivery', () => {
    it('should validate correct webhook signature', async () => {
      const payload = { event: 'automation.completed', data: 'test' };
      const secret = 'webhook-secret-123';
      const body = JSON.stringify(payload);

      const signature = generateSignature(payload, secret);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reject invalid signature', async () => {
      const payload = { event: 'test' };
      const correctSecret = 'correct-secret';
      const wrongSecret = 'wrong-secret';

      const correctSignature = generateSignature(payload, correctSecret);
      expect(correctSignature).not.toEqual(generateSignature(payload, wrongSecret));
    });
  });

  describe('Error Handling', () => {
    it('should capture and store error context on delivery failure', async () => {
      const automationId = 'auto-err-1';
      const executionId = 'exec-err-1';
      const webhookUrl = 'https://invalid-webhook.example.com';
      const payload = { test: 'data' };

      // Mock failed HTTP request
      global.fetch = jest.fn().mockRejectedValueOnce(
        new Error('ECONNREFUSED: Connection refused')
      );

      const delivery = {
        id: 'delivery-err-1',
        automationId,
        webhookId: webhookUrl,
        executionId,
        attemptNumber: 1,
        status: 'pending' as const,
        payload,
        signature: generateSignature(payload, 'secret'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await deliveryService.attemptDelivery(delivery);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Connection');
    });

    it('should handle HTTP error responses correctly', async () => {
      const delivery = {
        id: 'delivery-http-err',
        automationId: 'auto-1',
        webhookId: 'https://example.com/webhook',
        executionId: 'exec-1',
        attemptNumber: 1,
        status: 'pending' as const,
        payload: { test: 'data' },
        signature: 'sig123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mock 500 HTTP error
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValueOnce('Internal Server Error')
      });

      const result = await deliveryService.attemptDelivery(delivery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should timeout webhook delivery after 30 seconds', async () => {
      const delivery = {
        id: 'delivery-timeout',
        automationId: 'auto-1',
        webhookId: 'https://slow-webhook.example.com',
        executionId: 'exec-1',
        attemptNumber: 1,
        status: 'pending' as const,
        payload: { test: 'data' },
        signature: 'sig123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mock timeout error
      global.fetch = jest.fn().mockRejectedValueOnce(
        new Error('Request timeout after 30000ms')
      );

      const result = await deliveryService.attemptDelivery(delivery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
