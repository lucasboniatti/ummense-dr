import request from 'supertest';
import app from '../src/app';

const testUrl = 'https://example.com/webhook';
const testDescription = 'Test webhook for UI';

describe('Webhook UI - Integration Tests', () => {
  let userId = 'test-user-id';
  let webhookId: string;
  let apiKey: string;

  // Mock authentication - in real tests, use proper auth setup
  beforeEach(() => {
    (request as any).user = { id: userId };
  });

  describe('AC-1: Create Webhook', () => {
    test('should create webhook with URL and description', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer token`)
        .send({
          url: testUrl,
          description: testDescription,
          enabled: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('apiKey');
      expect(res.body.apiKeyPreview).toMatch(/^sk_\w{4}$/);
      expect(res.body.url).toBe(testUrl);

      webhookId = res.body.id;
      apiKey = res.body.apiKey;
    });

    test('should reject HTTP URLs (HTTPS required)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer token`)
        .send({
          url: 'http://example.com/webhook',
          description: 'HTTP webhook',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/https/i);
    });

    test('should reject localhost URLs (SSRF protection)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer token`)
        .send({
          url: 'https://localhost:3000/webhook',
          description: 'Localhost webhook',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/localhost|SSRF/i);
    });
  });

  describe('AC-2: API Key Security', () => {
    test('should return full API key only on creation', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer token`)
        .send({
          url: testUrl,
          description: 'Key test',
        });

      expect(res.body.apiKey).toBeDefined();
      expect(res.body.apiKey.length).toBeGreaterThan(10);
    });

    test('should mask API key in edit view (show only last 4)', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(200);
      expect(res.body.apiKeyPreview).toMatch(/^sk_\w{4}$/);
      expect(res.body).not.toHaveProperty('apiKey'); // Full key should not be returned
    });
  });

  describe('AC-3: List Webhooks', () => {
    test('should list all webhooks with stats', async () => {
      const res = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('url');
        expect(res.body[0]).toHaveProperty('successRate');
        expect(res.body[0]).toHaveProperty('enabled');
      }
    });
  });

  describe('AC-4: Delivery History Filtering', () => {
    test('should filter deliveries by status', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries?status=success`)
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((delivery: any) => {
        expect(delivery.status).toBe('success');
      });
    });

    test('should filter deliveries by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should search deliveries by event ID', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .query({ search: 'task-123' })
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should limit results to 50 max', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .query({ limit: 100 }) // Try to request 100
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(50);
    });
  });

  describe('AC-5: Test Webhook', () => {
    test('should send test webhook immediately (bypass queue)', async () => {
      const res = await request(app)
        .post(`/api/webhooks/${webhookId}/test`)
        .set('Authorization', `Bearer token`)
        .send({
          event_type: 'task:created',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('statusCode');
      expect(res.body).toHaveProperty('statusMessage');
      expect(res.body).toHaveProperty('elapsed');
      expect(res.body.elapsed).toBeGreaterThan(0);
    });

    test('should include response body in test result', async () => {
      const res = await request(app)
        .post(`/api/webhooks/${webhookId}/test`)
        .set('Authorization', `Bearer token`)
        .send({
          event_type: 'rule:executed',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('body');
      expect(res.body).toHaveProperty('headers');
    });
  });

  describe('AC-6: Delivery Metrics', () => {
    test('should return delivery metrics for last 24 hours', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/metrics`)
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('successCount');
      expect(res.body).toHaveProperty('failureCount');
      expect(res.body).toHaveProperty('successRate');
      expect(res.body.successRate).toBeGreaterThanOrEqual(0);
      expect(res.body.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('AC-7: Update Webhook', () => {
    test('should update webhook URL', async () => {
      const newUrl = 'https://example.com/webhook-v2';
      const res = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer token`)
        .send({
          url: newUrl,
        });

      expect(res.status).toBe(200);
      expect(res.body.url).toBe(newUrl);
    });

    test('should toggle webhook enabled status', async () => {
      const res = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer token`)
        .send({
          enabled: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });
  });

  describe('AC-8: Delete Webhook', () => {
    test('should soft delete webhook (keep history)', async () => {
      const res = await request(app)
        .delete(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer token`);

      expect(res.status).toBe(204);

      // Verify webhook is no longer listed
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer token`);

      const found = listRes.body.find((w: any) => w.id === webhookId);
      expect(found).toBeUndefined();
    });
  });

  describe('AC-9: Delivery Status Badges', () => {
    test('should return correct status values', async () => {
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/deliveries`)
        .set('Authorization', `Bearer token`);

      const validStatuses = ['success', 'failed', 'pending', 'dead_lettered'];
      res.body.data.forEach((delivery: any) => {
        expect(validStatuses).toContain(delivery.status);
      });
    });
  });

  describe('Authorization', () => {
    test('should reject requests without authentication', async () => {
      const res = await request(app)
        .get('/api/webhooks');

      expect(res.status).toBe(401);
    });

    test('should not allow users to access other users webhooks', async () => {
      const otherUserId = 'other-user-id';
      const res = await request(app)
        .get(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer token`)
        .set('X-User-ID', otherUserId);

      expect(res.status).toBe(404);
    });
  });
});
