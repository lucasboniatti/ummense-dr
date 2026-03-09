import crypto from 'crypto';

/**
 * OAuth PKCE (RFC 7636) Implementation
 * Supports Slack and Discord without client secrets exposed
 */
export class OAuthPKCEService {
  /**
   * Generate code_verifier and code_challenge for PKCE flow
   * @returns { codeVerifier, codeChallenge }
   */
  static generatePKCEPair(): { codeVerifier: string; codeChallenge: string } {
    // Generate random 128-character string (recommended by RFC 7636)
    const codeVerifier = crypto
      .randomBytes(96)
      .toString('base64url')
      .slice(0, 128);

    // SHA256(verifier) → base64url
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Validate code_challenge matches code_verifier
   * @param verifier Provided code_verifier
   * @param challenge Expected code_challenge
   * @returns true if valid
   */
  static validatePKCE(verifier: string, challenge: string): boolean {
    const computed = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return computed === challenge;
  }

  /**
   * Generate authorization URL for Slack
   */
  static getSlackAuthUrl(
    clientId: string,
    codeChallenge: string,
    redirectUri: string = process.env.SLACK_REDIRECT_URI || 'http://127.0.0.1:3000/auth/integration-callback?provider=slack',
    state: string = crypto.randomUUID()
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'chat:write chat:write.public',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri,
      state,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Generate authorization URL for Discord
   */
  static getDiscordAuthUrl(
    clientId: string,
    codeChallenge: string,
    redirectUri: string = process.env.DISCORD_REDIRECT_URI || 'http://127.0.0.1:3000/auth/integration-callback?provider=discord',
    state: string = crypto.randomUUID()
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'chat.write',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri,
      state,
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token (Backend only)
   * For Slack
   */
  static async exchangeCodeForSlackToken(
    code: string,
    codeVerifier: string,
    clientId: string,
    redirectUri?: string
  ): Promise<{
    access_token: string;
    team_id: string;
    team_name: string;
    scope: string;
    expires_in?: number;
    bot_user_id?: string;
    app_id?: string;
  }> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        code: code,
        code_verifier: codeVerifier, // PKCE instead of client_secret
        redirect_uri: redirectUri || process.env.SLACK_REDIRECT_URI || '',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Slack OAuth error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    if (!data.ok) {
      throw new Error(`Slack OAuth failed: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      team_id: data.team_id,
      team_name: data.team_name,
      scope: data.scope,
      bot_user_id: data.bot_user_id,
      app_id: data.app_id,
    };
  }

  /**
   * Exchange authorization code for access token (Backend only)
   * For Discord
   */
  static async exchangeCodeForDiscordToken(
    code: string,
    codeVerifier: string,
    clientId: string,
    redirectUri?: string
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    guild: { id: string; name: string };
  }> {
    const response = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        code: code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || process.env.DISCORD_REDIRECT_URI || '',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord OAuth error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    return {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      guild: data.guild,
    };
  }
}
