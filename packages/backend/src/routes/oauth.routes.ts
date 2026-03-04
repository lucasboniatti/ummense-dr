import { Router, Request, Response } from 'express';
import { OAuthPKCEService } from '../services/oauth-pkce.service';
import { IntegrationTokenService } from '../services/integration-token.service';
import { asString } from '../utils/http';

const router = Router();
const oauthService = new OAuthPKCEService();
const tokenService = new IntegrationTokenService();

/**
 * GET /oauth/slack/start
 * Initiate Slack OAuth flow
 * Returns authorization URL to redirect user to Slack
 */
router.get('/slack/start', (req: Request, res: Response) => {
  try {
    const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();

    // Store in session for later verification
    req.session = req.session || {};
    (req.session as any).code_verifier = codeVerifier;
    (req.session as any).code_challenge = codeChallenge;

    const authUrl = OAuthPKCEService.getSlackAuthUrl(
      process.env.SLACK_CLIENT_ID || '',
      codeChallenge
    );

    res.json({ auth_url: authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * GET /oauth/slack/callback
 * Slack OAuth callback endpoint
 * Exchanges authorization code for access token
 */
router.get('/slack/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    const codeVerifier = (req.session as any)?.code_verifier;

    if (!code || !codeVerifier) {
      return res.status(400).json({ error: 'Missing authorization code or code_verifier' });
    }

    // Exchange code for token (backend only)
    const tokenResponse = await OAuthPKCEService.exchangeCodeForSlackToken(
      code,
      codeVerifier,
      process.env.SLACK_CLIENT_ID || ''
    );

    // Get user ID from auth context (would come from session/JWT in real app)
    const userId = (req.session as any)?.userId || 'placeholder-user-id';

    // Store encrypted token
    await tokenService.storeSlackToken(
      userId,
      tokenResponse.team_id,
      tokenResponse.access_token,
      process.env.KMS_KEY_ID || '',
      tokenResponse.scope.split(',')
    );

    // Clear session
    delete (req.session as any).code_verifier;
    delete (req.session as any).code_challenge;

    // Redirect to success page
    res.redirect(`/integrations/success?type=slack&workspace=${tokenResponse.team_id}`);
  } catch (error) {
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

/**
 * GET /oauth/discord/start
 * Initiate Discord OAuth flow
 */
router.get('/discord/start', (req: Request, res: Response) => {
  try {
    const { codeVerifier, codeChallenge } = OAuthPKCEService.generatePKCEPair();

    req.session = req.session || {};
    (req.session as any).code_verifier = codeVerifier;
    (req.session as any).code_challenge = codeChallenge;

    const authUrl = OAuthPKCEService.getDiscordAuthUrl(
      process.env.DISCORD_CLIENT_ID || '',
      codeChallenge
    );

    res.json({ auth_url: authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

/**
 * GET /oauth/discord/callback
 * Discord OAuth callback endpoint
 */
router.get('/discord/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    const codeVerifier = (req.session as any)?.code_verifier;

    if (!code || !codeVerifier) {
      return res.status(400).json({ error: 'Missing authorization code or code_verifier' });
    }

    // Exchange code for token
    const tokenResponse = await OAuthPKCEService.exchangeCodeForDiscordToken(
      code,
      codeVerifier,
      process.env.DISCORD_CLIENT_ID || '',
      process.env.DISCORD_CLIENT_SECRET
    );

    // Future: Store Discord token (needs separate table)
    // Similar to Slack token storage

    // Clear session
    delete (req.session as any).code_verifier;
    delete (req.session as any).code_challenge;

    // Redirect to success page
    res.redirect(`/integrations/success?type=discord&server=${tokenResponse.guild.id}`);
  } catch (error) {
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

/**
 * POST /oauth/disconnect/:type/:id
 * Disconnect an integration
 */
router.post('/disconnect/:type/:id', async (req: Request, res: Response) => {
  try {
    const type = asString((req.params as any).type);
    const id = asString((req.params as any).id);
    const userId = (req.session as any)?.userId || 'placeholder-user-id';

    if (type === 'slack') {
      await tokenService.deleteSlackToken(userId, id);
      res.json({ success: true, message: 'Slack integration disconnected' });
    } else if (type === 'discord') {
      // Future: Discord disconnect
      res.json({ success: true, message: 'Discord integration disconnected' });
    } else {
      res.status(400).json({ error: 'Unknown integration type' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

export default router;
