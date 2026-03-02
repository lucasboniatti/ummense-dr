import { RuleExecutionService } from './rule-execution.service';
import { SlackClientService } from './slack-client.service';

interface SlashCommandPayload {
  team_id: string;
  team_domain: string;
  channel_id: string;
  user_id: string;
  command: string;
  text: string;
  api_app_id: string;
  response_url: string;
  trigger_id: string;
}

/**
 * Slack Slash Command Service
 * Handles /automation command to execute rules from Slack
 */
export class SlackSlashCommandService {
  private ruleExecutionService = new RuleExecutionService();
  private slackClient = new SlackClientService();

  /**
   * Process slash command /automation
   * Usage: /automation rule-id-123
   */
  async handleAutomationCommand(
    payload: SlashCommandPayload,
    slackSigningSecret: string
  ): Promise<{ response_type: string; text: string; blocks: any[] }> {
    const ruleId = payload.text.trim().split(' ')[0];

    if (!ruleId) {
      return {
        response_type: 'ephemeral',
        text: 'Usage: `/automation <rule-id>`',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Usage Error*\n`/automation <rule-id>`',
            },
          },
        ],
      };
    }

    try {
      // Execute rule
      const startTime = Date.now();
      const result = await this.ruleExecutionService.executeRule(ruleId, {
        source: 'slack_slash_command',
        userId: payload.user_id,
        teamId: payload.team_id,
      });
      const duration = Date.now() - startTime;

      return {
        response_type: 'in_channel',
        text: `Rule execution started: ${ruleId}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Rule Execution*\n*Rule:* \`${ruleId}\`\n*Status:* ${result.status}\n*Duration:* ${duration}ms`,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        response_type: 'ephemeral',
        text: `Error executing rule: ${message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Execution Error*\n\`\`\`\n${message}\n\`\`\``,
            },
          },
        ],
      };
    }
  }

  /**
   * Validate slash command request
   * Checks X-Slack-Signature header
   */
  static validateSlashCommand(
    timestamp: string,
    signature: string,
    body: string,
    signingSecret: string
  ): boolean {
    return SlackClientService.validateSlackSignature(timestamp, signature, body, signingSecret);
  }
}
