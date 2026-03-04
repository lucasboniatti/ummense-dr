import { IntegrationTokenService } from './integration-token.service';

interface DiscordMessage {
  channel_id: string;
  content: string;
  embeds?: DiscordEmbed[];
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
}

interface DiscordFile {
  channel_id: string;
  file: Buffer;
  filename: string;
  description?: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0 = text, 2 = voice, etc.
}

/**
 * Discord API Client (v14)
 * Handles message posting, file uploads, and channel listing
 */
export class DiscordClientService {
  private tokenService = new IntegrationTokenService();
  private apiBaseUrl = 'https://discord.com/api/v14';

  /**
   * Send message to Discord channel
   */
  async sendMessage(
    userId: string,
    serverId: string,
    message: DiscordMessage
  ): Promise<{ id: string; channel_id: string }> {
    const token = await this.getDiscordToken(userId, serverId);
    if (!token) {
      throw new Error('Discord token not found');
    }

    const response = await fetch(
      `${this.apiBaseUrl}/channels/${message.channel_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${token}`,
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    return { id: data.id, channel_id: data.channel_id };
  }

  /**
   * Upload file to Discord channel
   */
  async uploadFile(
    userId: string,
    serverId: string,
    file: DiscordFile
  ): Promise<{ message_id: string }> {
    const token = await this.getDiscordToken(userId, serverId);
    if (!token) {
      throw new Error('Discord token not found');
    }

    const formData = new FormData();
    const fileBytes = new Uint8Array(file.file);
    formData.append('files[0]', new Blob([fileBytes]), file.filename);

    // Add content with description if provided
    const payload: any = {};
    if (file.description) {
      payload.content = file.description;
    }
    formData.append('payload_json', JSON.stringify(payload));

    const response = await fetch(
      `${this.apiBaseUrl}/channels/${file.channel_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    return { message_id: data.id };
  }

  /**
   * List guilds (servers) for bot
   */
  async listGuilds(userId: string): Promise<any[]> {
    const token = await this.getDiscordTokenForUser(userId);
    if (!token) {
      throw new Error('Discord token not found for user');
    }

    const response = await fetch(`${this.apiBaseUrl}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return (await response.json()) as any[];
  }

  /**
   * List channels in guild
   */
  async listChannels(userId: string, serverId: string): Promise<DiscordChannel[]> {
    const token = await this.getDiscordToken(userId, serverId);
    if (!token) {
      throw new Error('Discord token not found');
    }

    const response = await fetch(`${this.apiBaseUrl}/guilds/${serverId}/channels`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const channels = (await response.json()) as any[];
    return channels
      .filter((ch) => ch.type === 0) // Text channels only
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
      }));
  }

  /**
   * Get stored Discord token (for bot operations)
   */
  private async getDiscordToken(userId: string, serverId: string): Promise<string | null> {
    // Note: Discord tokens are stored differently than Slack
    // This is a placeholder - would need Discord-specific storage table
    return null;
  }

  /**
   * Get user's Discord token (for user operations)
   */
  private async getDiscordTokenForUser(userId: string): Promise<string | null> {
    // Placeholder - would need Discord user token storage
    return null;
  }
}
