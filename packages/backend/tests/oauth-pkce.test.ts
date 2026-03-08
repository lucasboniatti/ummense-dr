import { describe, it, expect } from 'vitest';
import { OAuthPKCEService } from '../src/services/oauth-pkce.service';

describe('OAuthPKCEService', () => {
  describe('generatePKCEPair', () => {
    it('should generate code_verifier and code_challenge', () => {
      const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();

      expect(codeVerifier).toBeDefined();
      expect(codeChallenge).toBeDefined();
      expect(codeVerifier.length).toBeLessThanOrEqual(128);
      expect(codeChallenge.length).toBeGreaterThan(0);
    });

    it('should generate different pairs on each call', () => {
      const pair1 = OAuthPKCEService.generatePKCEPair();
      const pair2 = OAuthPKCEService.generatePKCEPair();

      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
      expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });
  });

  describe('validatePKCE', () => {
    it('should validate correct code_verifier and code_challenge', () => {
      const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const isValid = OAuthPKCEService.validatePKCE(codeVerifier, codeChallenge);

      expect(isValid).toBe(true);
    });

    it('should reject invalid code_verifier', () => {
      const { codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const wrongVerifier = 'invalid-verifier';

      const isValid = OAuthPKCEService.validatePKCE(wrongVerifier, codeChallenge);
      expect(isValid).toBe(false);
    });

    it('should reject mismatched pairs', () => {
      const pair1 = OAuthPKCEService.generatePKCEPair();
      const pair2 = OAuthPKCEService.generatePKCEPair();

      const isValid = OAuthPKCEService.validatePKCE(pair1.codeVerifier, pair2.codeChallenge);
      expect(isValid).toBe(false);
    });
  });

  describe('getSlackAuthUrl', () => {
    it('should return valid Slack auth URL', () => {
      const { codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const url = OAuthPKCEService.getSlackAuthUrl(
        'test-client-id',
        codeChallenge,
        'http://127.0.0.1:3000/auth/integration-callback?provider=slack',
        'slack:test-state'
      );

      expect(url).toContain('slack.com/oauth/v2/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain(`code_challenge=${codeChallenge}`);
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('scope=chat%3Awrite');
      expect(url).toContain('state=slack%3Atest-state');
    });
  });

  describe('getDiscordAuthUrl', () => {
    it('should return valid Discord auth URL', () => {
      const { codeChallenge } = OAuthPKCEService.generatePKCEPair();
      const url = OAuthPKCEService.getDiscordAuthUrl(
        'test-client-id',
        codeChallenge,
        'http://127.0.0.1:3000/auth/integration-callback?provider=discord',
        'discord:test-state'
      );

      expect(url).toContain('discord.com/api/oauth2/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain(`code_challenge=${codeChallenge}`);
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('scope=chat.write');
      expect(url).toContain('state=discord%3Atest-state');
    });
  });
});
