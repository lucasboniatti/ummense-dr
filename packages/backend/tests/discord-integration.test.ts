import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SendDiscordMessageAction } from '../src/actions/send-discord-message.action';
import { DiscordClientService } from '../src/services/discord-client.service';
import { OAuthPKCEService } from '../src/services/oauth-pkce.service';
import { IntegrationDisconnectService } from '../src/services/integration-disconnect.service';
import { integrationRateLimiter } from '../src/services/integration-rate-limiter.service';

describe('Discord Integration Tests', () => {
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

  describe('OAuth PKCE Flow', () => {
    it('should generate a Discord authorization URL with PKCE', () => {
      const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const authUrl = OAuthPKCEService.getDiscordAuthUrl('discord-client-id', codeChallenge);

      expect(OAuthPKCEService.validatePKCE(codeVerifier, codeChallenge)).toBe(true);
      expect(authUrl).toContain('discord.com/api/oauth2/authorize');
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(authUrl).toContain('scope=chat.write');
    });
  });

  describe('Message Sending', () => {
    it('should send templated Discord messages through the action layer', async () => {
      const sendMessageSpy = vi
        .spyOn(DiscordClientService.prototype, 'sendMessage')
        .mockResolvedValue({ id: 'message-123', channel_id: 'channel-123' });

      const result = await new SendDiscordMessageAction().execute({
        userId: 'user-123',
        serverId: 'guild-123',
        channelId: 'channel-123',
        template: 'Rule {{rule_name}} completed with {{status}}',
        variables: {
          rule_name: 'High Priority Alert',
          status: 'success',
        },
      });

      expect(result).toEqual({ success: true, messageId: 'message-123' });
      expect(sendMessageSpy).toHaveBeenCalledWith('user-123', 'guild-123', {
        channel_id: 'channel-123',
        content: 'Rule High Priority Alert completed with success',
      });
    });

    it('should upload files to Discord channels with a stored bot token', async () => {
      const discordClient = new DiscordClientService();
      vi.spyOn(discordClient as any, 'getDiscordToken').mockResolvedValue('discord-bot-token');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'upload-message-1' }),
        text: async () => 'ok',
      } as Response);

      const result = await discordClient.uploadFile('user-123', 'guild-123', {
        channel_id: 'channel-123',
        file: Buffer.from('report body'),
        filename: 'report.txt',
        description: 'Automated report',
      });

      expect(result).toEqual({ message_id: 'upload-message-1' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/v14/channels/channel-123/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bot discord-bot-token' }),
        })
      );
    });

    it('should return only text channels when listing guild channels', async () => {
      const discordClient = new DiscordClientService();
      vi.spyOn(discordClient as any, 'getDiscordToken').mockResolvedValue('discord-bot-token');

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'general', name: 'general', type: 0 },
          { id: 'voice', name: 'voice', type: 2 },
          { id: 'alerts', name: 'alerts', type: 0 },
        ],
      } as Response);

      const channels = await discordClient.listChannels('user-123', 'guild-123');

      expect(channels).toEqual([
        { id: 'general', name: 'general', type: 0 },
        { id: 'alerts', name: 'alerts', type: 0 },
      ]);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce the Discord rate limit at 50 requests per minute', async () => {
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
  });

  describe('Disconnect & Cleanup', () => {
    it('should revoke the Discord token when one is available', async () => {
      vi.spyOn(DiscordClientService.prototype as any, 'getDiscordToken').mockResolvedValue(
        'discord-bot-token'
      );

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
});
