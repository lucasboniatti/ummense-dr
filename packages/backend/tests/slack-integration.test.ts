import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SendSlackMessageAction } from '../src/actions/send-slack-message.action';
import { OAuthPKCEService } from '../src/services/oauth-pkce.service';
import { IntegrationDisconnectService } from '../src/services/integration-disconnect.service';
import { integrationRateLimiter } from '../src/services/integration-rate-limiter.service';
import { IntegrationTokenService } from '../src/services/integration-token.service';
import { RuleExecutionService } from '../src/services/rule-execution.service';
import { SlackClientService } from '../src/services/slack-client.service';
import { SlackSlashCommandService } from '../src/services/slack-slash-command.service';

describe('Slack Integration Tests', () => {
  beforeEach(() => {
    integrationRateLimiter.resetAll();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, ts: 'ts-1', channel: 'C123456' }),
      text: async () => 'ok',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    integrationRateLimiter.resetAll();
  });

  describe('OAuth PKCE Flow', () => {
    it('should generate valid auth URL with PKCE parameters', () => {
      const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const authUrl = OAuthPKCEService.getSlackAuthUrl('test-client-id', codeChallenge);

      expect(OAuthPKCEService.validatePKCE(codeVerifier, codeChallenge)).toBe(true);
      expect(authUrl).toContain('slack.com/oauth/v2/authorize');
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(authUrl).toContain('scope=chat%3Awrite');
    });
  });

  describe('Message Sending', () => {
    it('should send templated Slack message through the action layer', async () => {
      const sendMessageSpy = vi
        .spyOn(SlackClientService.prototype, 'sendMessage')
        .mockResolvedValue({ ts: 'ts-123', channel: 'C123456' });

      const result = await new SendSlackMessageAction().execute({
        userId: 'user-123',
        workspaceId: 'T123456',
        channel: 'C123456',
        template: 'Rule {{rule_name}} completed with {{status}}',
        variables: {
          rule_name: 'High Priority Alert',
          status: 'success',
        },
      });

      expect(result).toEqual({ success: true, messageId: 'ts-123' });
      expect(sendMessageSpy).toHaveBeenCalledWith('user-123', 'T123456', {
        channel: 'C123456',
        text: 'Rule High Priority Alert completed with success',
        thread_ts: undefined,
      });
    });

    it('should enforce the Slack rate limit at 60 requests per minute', async () => {
      vi.spyOn(SlackClientService.prototype, 'sendMessage').mockResolvedValue({
        ts: 'ts-rate-limit',
        channel: 'C123456',
      });

      const action = new SendSlackMessageAction();

      for (let index = 0; index < 60; index++) {
        const result = await action.execute({
          userId: 'user-123',
          workspaceId: 'T-rate-limit',
          channel: 'C123456',
          template: 'Message {{rule_name}}',
          variables: { rule_name: `Rule ${index}` },
        });

        expect(result.success).toBe(true);
      }

      const blocked = await action.execute({
        userId: 'user-123',
        workspaceId: 'T-rate-limit',
        channel: 'C123456',
        template: 'Message {{rule_name}}',
        variables: { rule_name: 'Rule 60' },
      });

      expect(blocked.success).toBe(false);
      expect(blocked.error).toContain('Rate limited');
    });
  });

  describe('Slack Signature Validation', () => {
    it('should validate a correct Slack signature and reject stale requests', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ command: '/automation', text: 'rule-123' });
      const signingSecret = 'test-signing-secret';
      const signature = `v0=${crypto
        .createHmac('sha256', signingSecret)
        .update(`v0:${timestamp}:${body}`)
        .digest('hex')}`;

      expect(
        SlackClientService.validateSlackSignature(timestamp, signature, body, signingSecret)
      ).toBe(true);

      const staleTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
      expect(
        SlackClientService.validateSlackSignature(staleTimestamp, signature, body, signingSecret)
      ).toBe(false);
    });
  });

  describe('Slash Command Execution', () => {
    it('should execute the rule and return an in-channel response', async () => {
      vi.spyOn(RuleExecutionService.prototype, 'executeRule').mockResolvedValue({
        status: 'success',
        result: {
          executedActions: 1,
          errors: [],
        },
      });

      const response = await new SlackSlashCommandService().handleAutomationCommand(
        {
          team_id: 'T123456',
          team_domain: 'ummense',
          channel_id: 'C123456',
          user_id: 'U123456',
          command: '/automation',
          text: 'rule-123',
          api_app_id: 'A123456',
          response_url: 'https://hooks.slack.test/commands',
          trigger_id: 'trigger-123',
        },
        'test-signing-secret'
      );

      expect(response.response_type).toBe('in_channel');
      expect(response.text).toContain('rule-123');
      expect(response.blocks[0].text.text).toContain('success');
    });
  });

  describe('Disconnect & Cleanup', () => {
    it('should revoke the token and soft-delete the Slack integration', async () => {
      const getTokenSpy = vi
        .spyOn(IntegrationTokenService.prototype, 'getSlackToken')
        .mockResolvedValue('xoxb-test-token');
      const deleteTokenSpy = vi
        .spyOn(IntegrationTokenService.prototype, 'deleteSlackToken')
        .mockResolvedValue();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      const result = await new IntegrationDisconnectService().disconnectSlack(
        'user-123',
        'T123456'
      );

      expect(result).toEqual({ success: true });
      expect(getTokenSpy).toHaveBeenCalledWith('user-123', 'T123456');
      expect(deleteTokenSpy).toHaveBeenCalledWith('user-123', 'T123456');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://slack.com/api/auth.revoke',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer xoxb-test-token' }),
        })
      );
    });
  });
});
