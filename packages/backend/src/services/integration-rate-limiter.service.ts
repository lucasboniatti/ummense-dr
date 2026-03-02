/**
 * Integration Rate Limiter Service
 * Enforces rate limits per integration type and workspace/server
 * - Slack: 60 requests per minute per workspace
 * - Discord: 50 requests per minute per server
 */
export class IntegrationRateLimiterService {
  // In-memory store for rate limiting (could be Redis in production)
  private counters = new Map<string, { count: number; resetAt: number }>();

  private readonly SLACK_LIMIT = 60;
  private readonly SLACK_WINDOW = 60 * 1000; // 1 minute in ms

  private readonly DISCORD_LIMIT = 50;
  private readonly DISCORD_WINDOW = 60 * 1000; // 1 minute in ms

  /**
   * Check if Slack request is within rate limit
   * @returns { allowed: boolean, retryAfter?: number }
   */
  checkSlackLimit(workspaceId: string): { allowed: boolean; retryAfter?: number } {
    const key = `slack:${workspaceId}`;
    return this.checkLimit(key, this.SLACK_LIMIT, this.SLACK_WINDOW);
  }

  /**
   * Check if Discord request is within rate limit
   * @returns { allowed: boolean, retryAfter?: number }
   */
  checkDiscordLimit(serverId: string): { allowed: boolean; retryAfter?: number } {
    const key = `discord:${serverId}`;
    return this.checkLimit(key, this.DISCORD_LIMIT, this.DISCORD_WINDOW);
  }

  /**
   * Generic rate limit checker
   */
  private checkLimit(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const existing = this.counters.get(key);

    // New window
    if (!existing || existing.resetAt < now) {
      this.counters.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }

    // Within window
    if (existing.count < limit) {
      existing.count++;
      return { allowed: true };
    }

    // Rate limited
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  /**
   * Reset counter for testing
   */
  reset(key: string): void {
    this.counters.delete(key);
  }

  /**
   * Reset all counters
   */
  resetAll(): void {
    this.counters.clear();
  }

  /**
   * Get current counter state
   */
  getState(key: string): { count: number; resetAt: number } | null {
    return this.counters.get(key) || null;
  }
}

// Singleton instance
export const integrationRateLimiter = new IntegrationRateLimiterService();
