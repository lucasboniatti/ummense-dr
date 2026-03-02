import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationRateLimiterService } from '../src/services/integration-rate-limiter.service';

describe('IntegrationRateLimiterService', () => {
  let limiter: IntegrationRateLimiterService;

  beforeEach(() => {
    limiter = new IntegrationRateLimiterService();
  });

  describe('checkSlackLimit', () => {
    it('should allow requests within limit', () => {
      const result = limiter.checkSlackLimit('workspace-123');
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should rate limit after 60 requests', () => {
      const workspaceId = 'workspace-123';

      // Make 60 requests
      for (let i = 0; i < 60; i++) {
        const result = limiter.checkSlackLimit(workspaceId);
        expect(result.allowed).toBe(true);
      }

      // 61st request should be rate limited
      const result = limiter.checkSlackLimit(workspaceId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', async () => {
      const workspaceId = 'workspace-123';

      // Make a request
      limiter.checkSlackLimit(workspaceId);

      // Reset
      limiter.reset(`slack:${workspaceId}`);

      // Should allow again
      const result = limiter.checkSlackLimit(workspaceId);
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkDiscordLimit', () => {
    it('should allow requests within limit', () => {
      const result = limiter.checkDiscordLimit('server-456');
      expect(result.allowed).toBe(true);
    });

    it('should rate limit after 50 requests', () => {
      const serverId = 'server-456';

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        const result = limiter.checkDiscordLimit(serverId);
        expect(result.allowed).toBe(true);
      }

      // 51st request should be rate limited
      const result = limiter.checkDiscordLimit(serverId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('resetAll', () => {
    it('should reset all counters', () => {
      limiter.checkSlackLimit('workspace-1');
      limiter.checkDiscordLimit('server-1');

      limiter.resetAll();

      const slackResult = limiter.checkSlackLimit('workspace-1');
      const discordResult = limiter.checkDiscordLimit('server-1');

      expect(slackResult.allowed).toBe(true);
      expect(discordResult.allowed).toBe(true);
    });
  });
});
