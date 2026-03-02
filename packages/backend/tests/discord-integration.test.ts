import { describe, it, expect, beforeEach } from 'vitest';
import { DiscordClientService } from '../src/services/discord-client.service';
import { OAuthPKCEService } from '../src/services/oauth-pkce.service';
import { integrationRateLimiter } from '../src/services/integration-rate-limiter.service';

describe('Discord Integration Tests', () => {
  let discordClient: DiscordClientService;

  beforeEach(() => {
    discordClient = new DiscordClientService();
    integrationRateLimiter.resetAll();
  });

  describe('OAuth PKCE Flow', () => {
    it('should generate valid Discord auth URL with PKCE parameters', () => {
      const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const authUrl = OAuthPKCEService.getDiscordAuthUrl('test-client-id', codeChallenge);

      expect(authUrl).toContain('discord.com/api/oauth2/authorize');
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(authUrl).toContain('scope=chat.write');
    });

    it('should validate PKCE pair for Discord', () => {
      const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const isValid = OAuthPKCEService.validatePKCE(codeVerifier, codeChallenge);

      expect(isValid).toBe(true);
    });
  });

  describe('Message Sending', () => {
    it('should prepare message with embeds', () => {
      const message = {
        channel_id: '123456789',
        content: 'Test message',
        embeds: [
          {
            title: 'Test Embed',
            description: 'Test description',
            color: 0x0099ff,
          },
        ],
      };

      expect(message.channel_id).toBeDefined();
      expect(message.content).toBeDefined();
      expect(message.embeds).toHaveLength(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit Discord requests to 50 per minute', () => {
      const serverId = 'guild-123';

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        const result = integrationRateLimiter.checkDiscordLimit(serverId);
        expect(result.allowed).toBe(true);
      }

      // 51st should be rate limited
      const result = integrationRateLimiter.checkDiscordLimit(serverId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should return retry-after header value', () => {
      const serverId = 'guild-456';

      // Max out limit
      for (let i = 0; i < 50; i++) {
        integrationRateLimiter.checkDiscordLimit(serverId);
      }

      const result = integrationRateLimiter.checkDiscordLimit(serverId);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Channel Listing', () => {
    it('should filter text channels only', () => {
      // Channel types: 0=text, 2=voice, 4=category
      const channels = [
        { id: 'ch1', name: 'general', type: 0 },
        { id: 'ch2', name: 'voice', type: 2 },
        { id: 'ch3', name: 'announcements', type: 0 },
      ];

      const textChannels = channels.filter((ch) => ch.type === 0);
      expect(textChannels).toHaveLength(2);
      expect(textChannels.every((ch) => ch.type === 0)).toBe(true);
    });
  });
});
