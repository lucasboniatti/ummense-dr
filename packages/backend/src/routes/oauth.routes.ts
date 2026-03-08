import { randomUUID } from 'crypto';
import { Router, Response } from 'express';
import { OAuthPKCEService } from '../services/oauth-pkce.service';
import { IntegrationTokenService } from '../services/integration-token.service';
import { IntegrationDisconnectService } from '../services/integration-disconnect.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { asString } from '../utils/http';

const router = Router();
const tokenService = new IntegrationTokenService();
const disconnectService = new IntegrationDisconnectService();

type OAuthCallbackBody = {
  code?: string;
  state?: string;
  code_verifier?: string;
};

function getUserId(req: AuthRequest, res: Response): string | null {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return String(userId);
}

function getFrontendBaseUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://127.0.0.1:3000'
  );
}

function buildFrontendCallbackUrl(provider: 'slack' | 'discord'): string {
  return `${getFrontendBaseUrl()}/auth/integration-callback?provider=${provider}`;
}

router.get('/slack/start', (req: AuthRequest, res: Response) => {
  if (!getUserId(req, res)) {
    return;
  }

  try {
    const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
    const state = `slack:${randomUUID()}`;
    const authUrl = OAuthPKCEService.getSlackAuthUrl(
      process.env.SLACK_CLIENT_ID || '',
      codeChallenge,
      buildFrontendCallbackUrl('slack'),
      state
    );

    res.json({
      auth_url: authUrl,
      state,
      code_verifier: codeVerifier,
      provider: 'slack',
    });
  } catch {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

router.post('/slack/callback', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const { code, state, code_verifier } = req.body as OAuthCallbackBody;

    if (!code || !state || !code_verifier) {
      return res
        .status(400)
        .json({ error: 'Missing authorization code, state, or code_verifier' });
    }

    if (!state.startsWith('slack:')) {
      return res.status(400).json({ error: 'Invalid OAuth state for Slack' });
    }

    const tokenResponse = await OAuthPKCEService.exchangeCodeForSlackToken(
      code,
      code_verifier,
      process.env.SLACK_CLIENT_ID || '',
      buildFrontendCallbackUrl('slack')
    );

    await tokenService.storeSlackToken(
      userId,
      tokenResponse.team_id,
      tokenResponse.access_token,
      process.env.KMS_KEY_ID || '',
      tokenResponse.scope.split(',').filter(Boolean),
      tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined
    );

    res.json({
      success: true,
      integration: {
        id: tokenResponse.team_id,
        workspace_id: tokenResponse.team_id,
        workspace_name: tokenResponse.team_name || tokenResponse.team_id,
        team_id: tokenResponse.team_id,
        bot_user_id: tokenResponse.bot_user_id || '',
        enabled: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    res.status(500).json({ error: message });
  }
});

router.get('/discord/start', (req: AuthRequest, res: Response) => {
  if (!getUserId(req, res)) {
    return;
  }

  try {
    const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();
    const state = `discord:${randomUUID()}`;
    const authUrl = OAuthPKCEService.getDiscordAuthUrl(
      process.env.DISCORD_CLIENT_ID || '',
      codeChallenge,
      buildFrontendCallbackUrl('discord'),
      state
    );

    res.json({
      auth_url: authUrl,
      state,
      code_verifier: codeVerifier,
      provider: 'discord',
    });
  } catch {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

router.post('/discord/callback', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const { code, state, code_verifier } = req.body as OAuthCallbackBody;

    if (!code || !state || !code_verifier) {
      return res
        .status(400)
        .json({ error: 'Missing authorization code, state, or code_verifier' });
    }

    if (!state.startsWith('discord:')) {
      return res.status(400).json({ error: 'Invalid OAuth state for Discord' });
    }

    const tokenResponse = await OAuthPKCEService.exchangeCodeForDiscordToken(
      code,
      code_verifier,
      process.env.DISCORD_CLIENT_ID || '',
      buildFrontendCallbackUrl('discord')
    );

    await tokenService.storeDiscordToken(
      userId,
      tokenResponse.guild.id,
      tokenResponse.access_token,
      process.env.KMS_KEY_ID || '',
      ['chat.write'],
      {
        tokenType: tokenResponse.token_type || 'Bearer',
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        guildName: tokenResponse.guild.name,
      }
    );

    res.json({
      success: true,
      integration: {
        id: tokenResponse.guild.id,
        guild_id: tokenResponse.guild.id,
        guild_name: tokenResponse.guild.name,
        bot_id: userId,
        enabled: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    res.status(500).json({ error: message });
  }
});

router.post('/disconnect/:type/:id', async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const type = asString((req.params as Record<string, string>).type);
    const id = asString((req.params as Record<string, string>).id);

    if (type === 'slack') {
      const result = await disconnectService.disconnectSlack(userId, id);
      return res.status(result.success ? 200 : 500).json(result);
    }

    if (type === 'discord') {
      const result = await disconnectService.disconnectDiscord(userId, id);
      return res.status(result.success ? 200 : 500).json(result);
    }

    res.status(400).json({ error: 'Unknown integration type' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect integration';
    res.status(500).json({ error: message });
  }
});

export default router;
