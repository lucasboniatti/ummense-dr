import { DiscordClientService } from '../services/discord-client.service';
import { TemplateEngineService } from '../services/template-engine.service';
import { integrationRateLimiter } from '../services/integration-rate-limiter.service';

interface SendDiscordMessagePayload {
  userId: string;
  serverId: string;
  channelId: string;
  template: string;
  variables: Record<string, any>;
}

/**
 * Send Discord Message Action
 * Called by webhook or automation engine
 */
export class SendDiscordMessageAction {
  private discordClient = new DiscordClientService();

  async execute(payload: SendDiscordMessagePayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check rate limit
      const rateCheck = integrationRateLimiter.checkDiscordLimit(payload.serverId);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: `Rate limited. Retry after ${rateCheck.retryAfter}s`,
        };
      }

      // Validate template
      const validation = TemplateEngineService.validateTemplate(payload.template);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid template: ${validation.errors.join(', ')}`,
        };
      }

      // Substitute variables
      const messageContent = TemplateEngineService.substitute(payload.template, payload.variables);

      // Send message
      const result = await this.discordClient.sendMessage(payload.userId, payload.serverId, {
        channel_id: payload.channelId,
        content: messageContent,
      });

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to send Discord message: ${message}`,
      };
    }
  }
}
