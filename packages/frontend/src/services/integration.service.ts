const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001';
const API_URL = `${API_BASE_URL}/api`;

export interface SlackIntegration {
  id: string;
  workspace_id: string;
  workspace_name: string;
  team_id: string;
  bot_user_id: string;
  enabled: boolean;
  created_at: string;
  expires_at?: string;
  channels?: { id: string; name: string }[];
}

export interface DiscordIntegration {
  id: string;
  guild_id: string;
  guild_name: string;
  bot_id: string;
  enabled: boolean;
  created_at: string;
  expires_at?: string;
  channels?: { id: string; name: string }[];
}

interface AuthCallbackPayload {
  code: string;
  state: string;
  code_verifier: string;
}

interface AuthStartResponse {
  auth_url: string;
  state: string;
  code_verifier: string;
  provider: 'slack' | 'discord';
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    window.localStorage.getItem('synkra_dev_token') ||
    window.localStorage.getItem('token')
  );
}

async function request(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const integrationService = {
  /**
   * List all connected integrations (Slack + Discord)
   */
  async listIntegrations() {
    return request('/integrations');
  },

  /**
   * Get Slack integrations
   */
  async listSlackIntegrations(): Promise<SlackIntegration[]> {
    return request('/integrations/slack');
  },

  /**
   * Get Discord integrations
   */
  async listDiscordIntegrations(): Promise<DiscordIntegration[]> {
    return request('/integrations/discord');
  },

  /**
   * Get Slack auth URL (PKCE flow)
   */
  async getSlackAuthUrl(): Promise<AuthStartResponse> {
    return request('/oauth/slack/start');
  },

  /**
   * Handle Slack OAuth callback
   */
  async handleSlackCallback(payload: AuthCallbackPayload) {
    return request('/oauth/slack/callback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get Discord auth URL (PKCE flow)
   */
  async getDiscordAuthUrl(): Promise<AuthStartResponse> {
    return request('/oauth/discord/start');
  },

  /**
   * Handle Discord OAuth callback
   */
  async handleDiscordCallback(payload: AuthCallbackPayload) {
    return request('/oauth/discord/callback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * List Slack channels for a workspace
   */
  async getSlackChannels(workspaceId: string): Promise<{ id: string; name: string }[]> {
    return request(`/integrations/slack/${workspaceId}/channels`);
  },

  /**
   * List Discord channels for a guild
   */
  async getDiscordChannels(guildId: string): Promise<{ id: string; name: string }[]> {
    return request(`/integrations/discord/${guildId}/channels`);
  },

  /**
   * Disconnect Slack workspace
   */
  async disconnectSlack(integrationId: string) {
    return request(`/oauth/disconnect/slack/${integrationId}`, {
      method: 'POST',
    });
  },

  /**
   * Disconnect Discord guild
   */
  async disconnectDiscord(integrationId: string) {
    return request(`/oauth/disconnect/discord/${integrationId}`, {
      method: 'POST',
    });
  },

  /**
   * Get Slack integration details
   */
  async getSlackIntegration(integrationId: string): Promise<SlackIntegration> {
    return request(`/integrations/slack/${integrationId}`);
  },

  /**
   * Get Discord integration details
   */
  async getDiscordIntegration(integrationId: string): Promise<DiscordIntegration> {
    return request(`/integrations/discord/${integrationId}`);
  },

  /**
   * Test Slack connection
   */
  async testSlackConnection(integrationId: string) {
    return request(`/integrations/slack/${integrationId}/test`, {
      method: 'POST',
    });
  },

  /**
   * Test Discord connection
   */
  async testDiscordConnection(integrationId: string) {
    return request(`/integrations/discord/${integrationId}/test`, {
      method: 'POST',
    });
  },
};
