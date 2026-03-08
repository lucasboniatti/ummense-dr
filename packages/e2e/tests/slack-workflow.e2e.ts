import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SendSlackMessageAction } from '../../backend/src/actions/send-slack-message.action';
import { OAuthPKCEService } from '../../backend/src/services/oauth-pkce.service';
import { IntegrationDisconnectService } from '../../backend/src/services/integration-disconnect.service';
import { integrationRateLimiter } from '../../backend/src/services/integration-rate-limiter.service';
import { IntegrationTokenService } from '../../backend/src/services/integration-token.service';
import { RuleExecutionService } from '../../backend/src/services/rule-execution.service';
import { SlackClientService } from '../../backend/src/services/slack-client.service';
import { SlackSlashCommandService } from '../../backend/src/services/slack-slash-command.service';

describe('Slack E2E Workflow', () => {
  beforeEach(() => {
    integrationRateLimiter.resetAll();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
      text: async () => 'ok',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    integrationRateLimiter.resetAll();
  });

  it('should complete the Slack connect -> send -> disconnect workflow', async () => {
    const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
    const authUrl = OAuthPKCEService.getSlackAuthUrl('slack-client-id', codeChallenge);

    vi.spyOn(OAuthPKCEService, 'exchangeCodeForSlackToken').mockResolvedValue({
      access_token: 'xoxb-workflow-token',
      team_id: 'T123456',
      team_name: 'Ummense',
      scope: 'chat:write,chat:write.public',
      bot_user_id: 'B123456',
      app_id: 'A123456',
    });
    vi.spyOn(IntegrationTokenService.prototype, 'storeSlackToken').mockResolvedValue({
      id: 'slack-token-1',
      user_id: 'user-123',
      workspace_id: 'T123456',
      encrypted_token: 'encrypted-token',
      kms_key_id: 'kms-key',
      token_type: 'bot',
      scopes: ['chat:write', 'chat:write.public'],
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } as any);
    vi.spyOn(IntegrationTokenService.prototype, 'getSlackToken').mockResolvedValue('xoxb-workflow-token');
    vi.spyOn(IntegrationTokenService.prototype, 'deleteSlackToken').mockResolvedValue();
    vi.spyOn(SlackClientService.prototype, 'sendMessage').mockResolvedValue({
      ts: 'ts-workflow-1',
      channel: 'C123456',
    });

    const tokenResponse = await OAuthPKCEService.exchangeCodeForSlackToken(
      'auth-code-123',
      codeVerifier,
      'slack-client-id'
    );
    await new IntegrationTokenService().storeSlackToken(
      'user-123',
      tokenResponse.team_id,
      tokenResponse.access_token,
      'kms-key',
      tokenResponse.scope.split(','),
    );

    const sendResult = await new SendSlackMessageAction().execute({
      userId: 'user-123',
      workspaceId: 'T123456',
      channel: 'C123456',
      template: 'Rule {{rule_name}} completed in {{duration_ms}}ms with status {{status}}',
      variables: {
        rule_name: 'High Priority Alert',
        duration_ms: 245,
        status: 'success',
      },
    });

    const disconnectResult = await new IntegrationDisconnectService().disconnectSlack(
      'user-123',
      'T123456'
    );

    expect(OAuthPKCEService.validatePKCE(codeVerifier, codeChallenge)).toBe(true);
    expect(authUrl).toContain('slack.com/oauth/v2/authorize');
    expect(sendResult).toEqual({ success: true, messageId: 'ts-workflow-1' });
    expect(disconnectResult).toEqual({ success: true });
  });

  it('should execute a rule from the Slack slash command flow', async () => {
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
      'signing-secret'
    );

    expect(response.response_type).toBe('in_channel');
    expect(response.text).toContain('rule-123');
  });

  it('should block the 61st Slack message in the same one-minute window', async () => {
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
