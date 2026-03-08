import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { IntegrationTokenService } from '../services/integration-token.service';
import { SlackClientService } from '../services/slack-client.service';
import { DiscordClientService } from '../services/discord-client.service';
import { asString } from '../utils/http';

const router = Router();
const tokenService = new IntegrationTokenService();
const slackClient = new SlackClientService();
const discordClient = new DiscordClientService();

function requireUserId(req: AuthRequest, res: Response): string | null {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return String(userId);
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const [slack, discord] = await Promise.all([
      tokenService.listSlackTokens(userId),
      tokenService.listDiscordTokens(userId),
    ]);

    res.json({
      slack: slack.map((integration) => ({
        id: integration.workspace_id,
        workspace_id: integration.workspace_id,
        workspace_name: integration.workspace_id,
        team_id: integration.workspace_id,
        bot_user_id: '',
        enabled: true,
        created_at: integration.created_at,
        expires_at: integration.expires_at || undefined,
      })),
      discord: discord.map((integration) => ({
        id: integration.guild_id,
        guild_id: integration.guild_id,
        guild_name: integration.guild_name || integration.guild_id,
        bot_id: '',
        enabled: true,
        created_at: integration.created_at,
        expires_at: integration.expires_at || undefined,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list integrations';
    res.status(500).json({ error: message });
  }
});

router.get('/slack', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const integrations = await tokenService.listSlackTokens(userId);
    res.json(
      integrations.map((integration) => ({
        id: integration.workspace_id,
        workspace_id: integration.workspace_id,
        workspace_name: integration.workspace_id,
        team_id: integration.workspace_id,
        bot_user_id: '',
        enabled: true,
        created_at: integration.created_at,
        expires_at: integration.expires_at || undefined,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list Slack integrations';
    res.status(500).json({ error: message });
  }
});

router.get('/discord', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const integrations = await tokenService.listDiscordTokens(userId);
    res.json(
      integrations.map((integration) => ({
        id: integration.guild_id,
        guild_id: integration.guild_id,
        guild_name: integration.guild_name || integration.guild_id,
        bot_id: '',
        enabled: true,
        created_at: integration.created_at,
        expires_at: integration.expires_at || undefined,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list Discord integrations';
    res.status(500).json({ error: message });
  }
});

router.get('/slack/:workspaceId', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const workspaceId = asString((req.params as Record<string, string>).workspaceId);
    const integrations = await tokenService.listSlackTokens(userId);
    const integration = integrations.find((entry) => entry.workspace_id === workspaceId);

    if (!integration) {
      return res.status(404).json({ error: 'Slack integration not found' });
    }

    res.json({
      id: integration.workspace_id,
      workspace_id: integration.workspace_id,
      workspace_name: integration.workspace_id,
      team_id: integration.workspace_id,
      bot_user_id: '',
      enabled: true,
      created_at: integration.created_at,
      expires_at: integration.expires_at || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Slack integration';
    res.status(500).json({ error: message });
  }
});

router.get('/discord/:guildId', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const guildId = asString((req.params as Record<string, string>).guildId);
    const integrations = await tokenService.listDiscordTokens(userId);
    const integration = integrations.find((entry) => entry.guild_id === guildId);

    if (!integration) {
      return res.status(404).json({ error: 'Discord integration not found' });
    }

    res.json({
      id: integration.guild_id,
      guild_id: integration.guild_id,
      guild_name: integration.guild_name || integration.guild_id,
      bot_id: '',
      enabled: true,
      created_at: integration.created_at,
      expires_at: integration.expires_at || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Discord integration';
    res.status(500).json({ error: message });
  }
});

router.get('/slack/:workspaceId/channels', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const workspaceId = asString((req.params as Record<string, string>).workspaceId);
    const channels = await slackClient.listChannels(userId, workspaceId);
    res.json(channels.map((channel) => ({ id: channel.id, name: channel.name })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Slack channels';
    res.status(500).json({ error: message });
  }
});

router.get('/discord/:guildId/channels', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const guildId = asString((req.params as Record<string, string>).guildId);
    const channels = await discordClient.listChannels(userId, guildId);
    res.json(channels.map((channel) => ({ id: channel.id, name: channel.name })));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Discord channels';
    res.status(500).json({ error: message });
  }
});

router.post('/slack/:workspaceId/test', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const workspaceId = asString((req.params as Record<string, string>).workspaceId);
    const channels = await slackClient.listChannels(userId, workspaceId);
    res.json({ success: true, channels: channels.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Slack integration test failed';
    res.status(500).json({ error: message });
  }
});

router.post('/discord/:guildId/test', async (req: AuthRequest, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const guildId = asString((req.params as Record<string, string>).guildId);
    const channels = await discordClient.listChannels(userId, guildId);
    res.json({ success: true, channels: channels.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discord integration test failed';
    res.status(500).json({ error: message });
  }
});

export default router;
