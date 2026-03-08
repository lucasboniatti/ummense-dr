import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SendDiscordMessageAction } from '../../backend/src/actions/send-discord-message.action';
import { DiscordClientService } from '../../backend/src/services/discord-client.service';
import { OAuthPKCEService } from '../../backend/src/services/oauth-pkce.service';
import { IntegrationDisconnectService } from '../../backend/src/services/integration-disconnect.service';
import { integrationRateLimiter } from '../../backend/src/services/integration-rate-limiter.service';
import { IntegrationTokenService } from '../../backend/src/services/integration-token.service';

describe('Discord E2E Workflow', () => {
  beforeEach(() => {
    integrationRateLimiter.resetAll();
    process.env.DISCORD_CLIENT_ID = 'discord-client-id';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'message-1', channel_id: 'channel-1' }),
      text: async () => 'ok',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    integrationRateLimiter.resetAll();
  });

  it('should complete the Discord auth -> message -> file upload workflow', async () => {
    const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
    const authUrl = OAuthPKCEService.getDiscordAuthUrl('discord-client-id', codeChallenge);

    vi.spyOn(OAuthPKCEService, 'exchangeCodeForDiscordToken').mockResolvedValue({
      access_token: 'discord-token',
      token_type: 'Bearer',
      expires_in: 3600,
      guild: { id: 'guild-123', name: 'Ummense Guild' },
    });
    vi.spyOn(DiscordClientService.prototype, 'sendMessage').mockResolvedValue({
      id: 'message-123',
      channel_id: 'channel-123',
    });

    const tokenResponse = await OAuthPKCEService.exchangeCodeForDiscordToken(
      'discord-auth-code',
      codeVerifier,
      'discord-client-id'
    );

    const sendResult = await new SendDiscordMessageAction().execute({
      userId: 'user-123',
      serverId: tokenResponse.guild.id,
      channelId: 'channel-123',
      template: 'Rule {{rule_name}} completed with {{status}}',
      variables: {
        rule_name: 'High Priority Alert',
        status: 'success',
      },
    });

    const discordClient = new DiscordClientService();
    vi.spyOn(IntegrationTokenService.prototype, 'getDiscordTokenRecord').mockResolvedValue({
      token: 'discord-token',
      tokenType: 'Bearer',
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'upload-1' }),
      text: async () => 'ok',
    } as Response);

    const uploadResult = await discordClient.uploadFile('user-123', 'guild-123', {
      channel_id: 'channel-123',
      file: Buffer.from('report body'),
      filename: 'report.txt',
      description: 'Automated report',
    });

    expect(OAuthPKCEService.validatePKCE(codeVerifier, codeChallenge)).toBe(true);
    expect(authUrl).toContain('discord.com/api/oauth2/authorize');
    expect(sendResult).toEqual({ success: true, messageId: 'message-123' });
    expect(uploadResult).toEqual({ message_id: 'upload-1' });
  });

  it('should enforce the Discord one-minute rate limit', async () => {
    vi.spyOn(DiscordClientService.prototype, 'sendMessage').mockResolvedValue({
      id: 'message-rate-limit',
      channel_id: 'channel-123',
    });

    const action = new SendDiscordMessageAction();

    for (let index = 0; index < 50; index++) {
      const result = await action.execute({
        userId: 'user-123',
        serverId: 'guild-rate-limit',
        channelId: 'channel-123',
        template: 'Message {{rule_name}}',
        variables: { rule_name: `Rule ${index}` },
      });

      expect(result.success).toBe(true);
    }

    const blocked = await action.execute({
      userId: 'user-123',
      serverId: 'guild-rate-limit',
      channelId: 'channel-123',
      template: 'Message {{rule_name}}',
      variables: { rule_name: 'Rule 50' },
    });

    expect(blocked.success).toBe(false);
    expect(blocked.error).toContain('Rate limited');
  });

  it('should revoke the Discord token during disconnect when one is available', async () => {
    vi.spyOn(IntegrationTokenService.prototype, 'getDiscordToken').mockResolvedValue(
      'discord-token'
    );
    vi.spyOn(IntegrationTokenService.prototype, 'deleteDiscordToken').mockResolvedValue();

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    } as Response);

    const result = await new IntegrationDisconnectService().disconnectDiscord(
      'user-123',
      'guild-123'
    );

    expect(result).toEqual({ success: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://discord.com/api/v10/oauth2/token/revoke',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('client_id=discord-client-id'),
      })
    );
  });
});
