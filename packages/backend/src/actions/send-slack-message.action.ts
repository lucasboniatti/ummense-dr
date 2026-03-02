import { SlackClientService } from '../services/slack-client.service';
import { TemplateEngineService } from '../services/template-engine.service';
import { integrationRateLimiter } from '../services/integration-rate-limiter.service';

interface SendSlackMessagePayload {
  userId: string;
  workspaceId: string;
  channel: string;
  template: string;
  variables: Record<string, any>;
  threadTs?: string;
}

/**
 * Send Slack Message Action
 * Called by webhook or automation engine
 */
export class SendSlackMessageAction {
  private slackClient = new SlackClientService();

  async execute(payload: SendSlackMessagePayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check rate limit
      const rateCheck = integrationRateLimiter.checkSlackLimit(payload.workspaceId);
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
      const messageText = TemplateEngineService.substitute(payload.template, payload.variables);

      // Send message
      const result = await this.slackClient.sendMessage(payload.userId, payload.workspaceId, {
        channel: payload.channel,
        text: messageText,
        thread_ts: payload.threadTs,
      });

      return {
        success: true,
        messageId: result.ts,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to send Slack message: ${message}`,
      };
    }
  }
}
