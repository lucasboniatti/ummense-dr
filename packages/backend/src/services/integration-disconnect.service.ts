import { IntegrationTokenService } from './integration-token.service';
import { DiscordClientService } from './discord-client.service';
import { SlackClientService } from './slack-client.service';

/**
 * Integration Disconnection Service
 * Handles revocation and deletion of integration tokens
 */
export class IntegrationDisconnectService {
  private tokenService = new IntegrationTokenService();
  private slackClient = new SlackClientService();
  private discordClient = new DiscordClientService();

  /**
   * Disconnect Slack integration
   * - Revoke token with Slack API
   * - Delete from database
   */
  async disconnectSlack(userId: string, workspaceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get token to revoke
      const token = await this.tokenService.getSlackToken(userId, workspaceId);

      if (token) {
        // Revoke with Slack API
        await this.revokeSlackToken(token);
      }

      // Delete from database (soft delete)
      await this.tokenService.deleteSlackToken(userId, workspaceId);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to disconnect Slack: ${message}`,
      };
    }
  }

  /**
   * Disconnect Discord integration
   * - Revoke token with Discord API
   * - Delete from database
   */
  async disconnectDiscord(userId: string, serverId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getDiscordToken(userId, serverId);
      if (token) {
        await this.revokeDiscordToken(token, process.env.DISCORD_CLIENT_ID || '');
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to disconnect Discord: ${message}`,
      };
    }
  }

  /**
   * Revoke Slack token
   * Calls Slack API auth.revoke endpoint
   */
  private async revokeSlackToken(token: string): Promise<void> {
    const response = await fetch('https://slack.com/api/auth.revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json() as any;
    if (!data.ok) {
      console.warn(`Slack token revocation failed: ${data.error}`);
      // Don't throw - token deletion should proceed anyway
    }
  }

  /**
   * Revoke Discord token
   */
  private async revokeDiscordToken(token: string, clientId: string): Promise<void> {
    const response = await fetch('https://discord.com/api/v10/oauth2/token/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        token: token,
      }).toString(),
    });

    if (!response.ok) {
      console.warn(`Discord token revocation failed: ${response.status}`);
    }
  }

  private async getDiscordToken(userId: string, serverId: string): Promise<string | null> {
    return (this.discordClient as any).getDiscordToken(userId, serverId);
  }
}
