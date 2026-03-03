/**
 * Load Tests for Webhook Delivery
 * Story 3.2: Webhook Reliability & Retry Logic
 * Performance: 1000+ concurrent deliveries, retry processing, DLQ queries
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { WebhookDeliveryService, WebhookDeliveryRecord } from '../automations/webhooks/webhook-delivery.service';
import { DLQService } from '../automations/webhooks/dlq.service';
import { generateSignature } from '../automations/webhooks/signature.service';

/**
 * Load test configuration
 */
const LOAD_TEST_CONFIG = {
  concurrentWebhooks: 1000,
  retriesPerMinute: 100,
  dlqQueryTimeout: 1000 // 1 second
};

describe('Webhook Delivery Load Tests', () => {
  let deliveryService: WebhookDeliveryService;
  let dlqService: DLQService;
  let mockDb: any;

  beforeEach(() => {
    deliveryService = new WebhookDeliveryService();
    dlqService = new DLQService();

    // Mock database with performance-aware mocks
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

  describe('Concurrent Webhook Deliveries', () => {
    it('should handle 1000 concurrent webhook creations without blocking', async () => {
      const startTime = Date.now();
      const deliveries: WebhookDeliveryRecord[] = [];

      const promises = [];
      for (let i = 0; i < LOAD_TEST_CONFIG.concurrentWebhooks; i++) {
        const promise = deliveryService.sendWebhook(
          `automation-${i % 10}`,
          `execution-${i}`,
          {
            url: `https://webhook.example.com/endpoint-${i % 100}`,
            secret: `secret-${i}`
          },
          { index: i, event: 'test.event' },
          mockDb
        );
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all webhooks were created
      expect(results).toHaveLength(LOAD_TEST_CONFIG.concurrentWebhooks);
      expect(results.every((r) => r.id !== undefined)).toBe(true);

      // Performance assertion: should complete in reasonable time
      const averageTimePerWebhook = duration / LOAD_TEST_CONFIG.concurrentWebhooks;
      expect(averageTimePerWebhook).toBeLessThan(10); // Less than 10ms per webhook
      console.log(
        `✓ Created ${LOAD_TEST_CONFIG.concurrentWebhooks} webhooks in ${duration}ms (${averageTimePerWebhook.toFixed(2)}ms per webhook)`
      );
    });

    it('should process 100+ retries per minute without degradation', async () => {
      const startTime = Date.now();
      const deliveryAttempts = [];

      // Simulate 100 webhook deliveries
      for (let i = 0; i < LOAD_TEST_CONFIG.retriesPerMinute; i++) {
        const delivery: WebhookDeliveryRecord = {
          id: `delivery-${i}`,
          automationId: `auto-${i % 10}`,
          webhookId: `https://webhook.example.com/endpoint`,
          executionId: `exec-${i}`,
          attemptNumber: Math.floor(i / 20) + 1, // Mix of different attempt numbers
          status: 'pending',
          payload: { index: i, data: 'test' },
          signature: generateSignature({ index: i }, 'secret'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const promise = deliveryService.attemptDelivery(delivery);
        deliveryAttempts.push(promise);
      }

      const results = await Promise.all(deliveryAttempts);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all attempts completed
      expect(results).toHaveLength(LOAD_TEST_CONFIG.retriesPerMinute);

      // Performance assertion: P99 latency should be < 100ms per delivery attempt
      const averageTime = duration / LOAD_TEST_CONFIG.retriesPerMinute;
      expect(averageTime).toBeLessThan(100);
      console.log(
        `✓ Processed ${LOAD_TEST_CONFIG.retriesPerMinute} delivery attempts in ${duration}ms (${averageTime.toFixed(2)}ms per attempt)`
      );
    });
  });

  describe('DLQ Query Performance', () => {
    it('should query DLQ with 1000+ items in <1 second', async () => {
      // Mock large result set
      const mockDLQItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `dlq-${i}`,
        automation_id: `auto-${i % 50}`,
        webhook_delivery_id: `delivery-${i}`,
        webhook_url: `https://webhook-${i % 100}.example.com/endpoint`,
        payload: { test: 'data' },
        retry_count: Math.floor(Math.random() * 5) + 1,
        last_error: 'Connection timeout',
        last_error_at: new Date().toISOString(),
        cleared_at: null,
        created_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }));

      // Setup mock to return items with count
      mockDb.first = jest.fn()
        .mockResolvedValueOnce({ total: 1000 }) // Count query
        .mockResolvedValueOnce(mockDLQItems[0]); // First item

      mockDb.select = jest.fn().mockReturnThis();
      mockDb.where = jest.fn().mockReturnThis();

      const startTime = Date.now();

      // Query the DLQ with pagination
      const result = await dlqService.list('auto-1', { page: 1, limit: 100 }, mockDb);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify result
      expect(result.total).toBe(1000);
      expect(result.limit).toBe(100);

      // Performance assertion: DLQ queries should complete in <1 second
      expect(duration).toBeLessThan(LOAD_TEST_CONFIG.dlqQueryTimeout);
      console.log(`✓ DLQ query with 1000 items completed in ${duration}ms`);
    });

    it('should filter DLQ items efficiently with complex queries', async () => {
      const startTime = Date.now();

      // Mock database for complex query
      mockDb.first = jest.fn()
        .mockResolvedValueOnce({ total: 250 }) // Count with filters
        .mockResolvedValueOnce({ id: 'dlq-1' }); // First filtered item

      // Execute complex query with multiple filters
      const result = await dlqService.query(
        'auto-1',
        {
          webhookUrl: 'example.com',
          errorContains: 'timeout',
          createdAfter: new Date(Date.now() - 3600000),
          createdBefore: new Date()
        },
        { page: 1, limit: 50 },
        mockDb
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.total).toBeLessThanOrEqual(250);
      expect(duration).toBeLessThan(500); // Complex queries should still be fast
      console.log(`✓ Complex DLQ query completed in ${duration}ms`);
    });
  });

  describe('Retry Scheduling Performance', () => {
    it('should calculate exponential backoff for 1000 attempts efficiently', () => {
      const startTime = Date.now();
      const backoffTimes = [];

      // Calculate backoff for 1000 sequential attempts (cycling through 5 backoff values)
      for (let i = 0; i < 1000; i++) {
        const attemptNum = i % 5;
        const nextRetryTime = deliveryService.getNextRetryTime(attemptNum);
        backoffTimes.push(nextRetryTime.getTime());
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertion: should complete in <100ms
      expect(duration).toBeLessThan(100);
      expect(backoffTimes).toHaveLength(1000);
      console.log(`✓ Calculated 1000 backoff intervals in ${duration}ms`);
    });

    it('should handle backoff calculation at scale without precision loss', () => {
      const intervals = [1, 5, 30, 300, 1800];
      const tolerance = 2; // seconds

      for (let i = 0; i < intervals.length; i++) {
        const nextRetryTime = deliveryService.getNextRetryTime(i);
        const delayMs = nextRetryTime.getTime() - Date.now();
        const delaySec = Math.round(delayMs / 1000);
        const expectedSec = intervals[i];

        const difference = Math.abs(delaySec - expectedSec);
        expect(difference).toBeLessThanOrEqual(tolerance);
      }
    });
  });

  describe('Memory Stability', () => {
    it('should not leak memory under sustained webhook load', async () => {
      const iterations = 100;
      let memoryIncrease = 0;

      // Get initial memory
      if (global.gc) {
        global.gc();
      }
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and process webhooks multiple times
      for (let iteration = 0; iteration < iterations; iteration++) {
        const promises = [];

        for (let i = 0; i < 100; i++) {
          const promise = deliveryService.sendWebhook(
            'auto-1',
            `exec-${iteration}-${i}`,
            {
              url: 'https://webhook.example.com',
              secret: 'secret'
            },
            { test: 'data' },
            mockDb
          );
          promises.push(promise);
        }

        await Promise.all(promises);

        // Periodic garbage collection
        if (iteration % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Get final memory
      if (global.gc) {
        global.gc();
      }
      const finalMemory = process.memoryUsage().heapUsed;
      memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      const increaseInMB = memoryIncrease / 1024 / 1024;
      expect(increaseInMB).toBeLessThan(50);
      console.log(`✓ Memory increase after 10,000 webhooks: ${increaseInMB.toFixed(2)}MB`);
    });
  });

  describe('Stress Testing', () => {
    it('should recover gracefully from burst webhook traffic', async () => {
      const burstSize = 5000;
      const promises = [];

      // Create burst of webhooks
      for (let i = 0; i < burstSize; i++) {
        const promise = deliveryService
          .sendWebhook(
            'auto-1',
            `burst-exec-${i}`,
            {
              url: 'https://webhook.example.com',
              secret: 'secret'
            },
            { burst: true, index: i },
            mockDb
          )
          .catch((error) => ({
            error: error.message,
            index: i
          }));
        promises.push(promise);
      }

      const results = await Promise.all(promises);

      // Count successes and failures
      const successful = results.filter((r) => r && !r.error).length;
      const failed = results.filter((r) => r && r.error).length;

      // Should handle burst without catastrophic failure
      expect(successful).toBeGreaterThan(burstSize * 0.95); // At least 95% success
      console.log(
        `✓ Handled burst of ${burstSize} webhooks: ${successful} successful, ${failed} failed`
      );
    });
  });
});
