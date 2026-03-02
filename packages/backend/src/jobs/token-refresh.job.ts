import { createClient } from '@supabase/supabase-js';
import { IntegrationTokenService } from '../services/integration-token.service';

/**
 * Token Refresh Job
 * Runs periodically to refresh tokens before expiration
 * Alerts if token expires in <7 days
 */
export class TokenRefreshJob {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  );
  private tokenService = new IntegrationTokenService();

  /**
   * Execute token refresh check
   * Should be called periodically (e.g., every hour)
   */
  async execute(): Promise<{ processed: number; refreshed: number; alerts: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;
    let refreshed = 0;
    let alerts = 0;

    try {
      // Get all non-deleted Slack tokens
      const { data: tokens, error } = await this.supabase
        .from('slack_tokens')
        .select('id, user_id, workspace_id, expires_at')
        .is('deleted_at', null)
        .not('expires_at', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch tokens: ${error.message}`);
      }

      if (!tokens || tokens.length === 0) {
        return { processed: 0, refreshed: 0, alerts: 0, errors };
      }

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (const token of tokens) {
        processed++;

        if (!token.expires_at) {
          continue;
        }

        const expiresAt = new Date(token.expires_at);

        // Alert if expires in <7 days
        if (expiresAt < sevenDaysFromNow) {
          alerts++;
          console.warn(
            `[TOKEN REFRESH] Token expiring soon: user=${token.user_id}, workspace=${token.workspace_id}, expires=${expiresAt.toISOString()}`
          );

          // In production, would send notification to user
          // await notificationService.sendAlert(token.user_id, {
          //   type: 'token_expiring',
          //   integration: 'slack',
          //   expiresAt: expiresAt.toISOString()
          // });
        }

        // Auto-refresh if already expired
        if (expiresAt <= now) {
          try {
            // Note: This would require storing refresh token
            // For now, just log that manual refresh is needed
            console.error(
              `[TOKEN REFRESH] Token expired: user=${token.user_id}, workspace=${token.workspace_id}`
            );

            // In production, would attempt to refresh using refresh_token
            // const newToken = await slackClient.refreshToken(refreshToken);
            // await tokenService.updateSlackToken(..., newToken);
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            errors.push(
              `Failed to refresh token for user=${token.user_id}, workspace=${token.workspace_id}: ${msg}`
            );
          }
        }
      }

      return { processed, refreshed, alerts, errors };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        processed: 0,
        refreshed: 0,
        alerts: 0,
        errors: [msg],
      };
    }
  }

  /**
   * Schedule this job to run hourly
   * Example usage in server initialization:
   *
   * const job = new TokenRefreshJob();
   * setInterval(() => job.execute(), 60 * 60 * 1000); // Every hour
   */
}
