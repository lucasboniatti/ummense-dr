import { IntegrationTokenService } from './integration-token.service';

interface SlackMessage {
  channel: string;
  text: string;
  thread_ts?: string;
  blocks?: any[];
}

interface SlackFile {
  channel: string;
  content: Buffer;
  filename: string;
  title?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
}

/**
 * Slack API Client
 * Handles message posting, file uploads, and channel listing
 */
export class SlackClientService {
  private tokenService = new IntegrationTokenService();
  private apiBaseUrl = 'https://slack.com/api';

  /**
   * Send message to Slack channel
   */
  async sendMessage(
    userId: string,
    workspaceId: string,
    message: SlackMessage
  ): Promise<{ ts: string; channel: string }> {
    const token = await this.tokenService.getSlackToken(userId, workspaceId);
    if (!token) {
      throw new Error('Slack token not found');
    }

    const response = await fetch(`${this.apiBaseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(message),
    });

    const data = await response.json() as any;
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return { ts: data.ts, channel: data.channel };
  }

  /**
   * Upload file to Slack channel
   */
  async uploadFile(
    userId: string,
    workspaceId: string,
    file: SlackFile
  ): Promise<{ file_id: string }> {
    const token = await this.tokenService.getSlackToken(userId, workspaceId);
    if (!token) {
      throw new Error('Slack token not found');
    }

    const formData = new FormData();
    formData.append('channel', file.channel);
    formData.append('file', new Blob([file.content]), file.filename);
    if (file.title) {
      formData.append('title', file.title);
    }

    const response = await fetch(`${this.apiBaseUrl}/files.upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json() as any;
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return { file_id: data.file.id };
  }

  /**
   * List channels for user
   */
  async listChannels(userId: string, workspaceId: string): Promise<SlackChannel[]> {
    const token = await this.tokenService.getSlackToken(userId, workspaceId);
    if (!token) {
      throw new Error('Slack token not found');
    }

    const response = await fetch(
      `${this.apiBaseUrl}/conversations.list?exclude_archived=true&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json() as any;
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      is_member: ch.is_member,
    }));
  }

  /**
   * Validate Slack request signature
   * Required for webhooks and slash commands
   */
  static validateSlackSignature(
    timestamp: string,
    signature: string,
    body: string,
    signingSecret: string = process.env.SLACK_SIGNING_SECRET || ''
  ): boolean {
    // X-Slack-Request-Timestamp: Unix timestamp
    // X-Slack-Signature: v0=hash

    const requestTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);

    // Request must be within 5 minutes
    if (Math.abs(now - requestTime) > 300) {
      return false;
    }

    const baseString = `v0:${timestamp}:${body}`;
    const hash = require('crypto')
      .createHmac('sha256', signingSecret)
      .update(baseString)
      .digest('hex');

    const expectedSignature = `v0=${hash}`;
    return expectedSignature === signature;
  }
}
