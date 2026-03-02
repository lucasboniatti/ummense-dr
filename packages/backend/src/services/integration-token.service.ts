import { createClient } from '@supabase/supabase-js';
import { TokenEncryptionService } from './token-encryption.service';

interface SlackToken {
  id: string;
  user_id: string;
  workspace_id: string;
  encrypted_token: string;
  kms_key_id: string;
  token_type: 'bot' | 'user' | 'incoming_webhook';
  scopes: string[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface IntegrationLog {
  id: string;
  user_id: string | null;
  integration_type: string;
  action: 'created' | 'updated' | 'deleted' | 'auth_refreshed' | 'error';
  resource_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

/**
 * Token Storage Service
 * Handles encrypted token persistence and audit logging
 */
export class IntegrationTokenService {
  private supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  );
  private encryption = new TokenEncryptionService();

  /**
   * Store Slack token (encrypted)
   */
  async storeSlackToken(
    userId: string,
    workspaceId: string,
    plainToken: string,
    kmsKeyId: string,
    scopes: string[],
    expiresAt?: Date
  ): Promise<SlackToken> {
    // Encrypt token before storage
    const encryptedToken = await this.encryption.encryptToken(plainToken, kmsKeyId);

    const { data, error } = await this.supabase
      .from('slack_tokens')
      .upsert(
        {
          user_id: userId,
          workspace_id: workspaceId,
          encrypted_token: encryptedToken,
          kms_key_id: kmsKeyId,
          token_type: 'bot',
          scopes,
          expires_at: expiresAt?.toISOString() || null,
        },
        { onConflict: 'user_id,workspace_id' }
      )
      .select()
      .single();

    if (error) {
      await this.logIntegrationEvent(userId, 'slack', 'error', workspaceId, { error: error.message });
      throw new Error(`Failed to store Slack token: ${error.message}`);
    }

    await this.logIntegrationEvent(userId, 'slack', 'created', workspaceId);
    return data as SlackToken;
  }

  /**
   * Retrieve Slack token (decrypted on-demand)
   */
  async getSlackToken(userId: string, workspaceId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('slack_tokens')
      .select('encrypted_token')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    try {
      return await this.encryption.decryptToken(data.encrypted_token);
    } catch (e) {
      console.error('Failed to decrypt Slack token:', e);
      return null;
    }
  }

  /**
   * List user's Slack integrations (without exposing tokens)
   */
  async listSlackTokens(userId: string): Promise<Omit<SlackToken, 'encrypted_token'>[]> {
    const { data, error } = await this.supabase
      .from('slack_tokens')
      .select('id, user_id, workspace_id, token_type, scopes, expires_at, created_at, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to list Slack tokens: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete/revoke Slack token (soft delete)
   */
  async deleteSlackToken(userId: string, workspaceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('slack_tokens')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(`Failed to delete Slack token: ${error.message}`);
    }

    await this.logIntegrationEvent(userId, 'slack', 'deleted', workspaceId);
  }

  /**
   * Refresh Slack token expiration
   */
  async updateSlackTokenExpiration(
    userId: string,
    workspaceId: string,
    newExpiresAt: Date
  ): Promise<void> {
    const { error } = await this.supabase
      .from('slack_tokens')
      .update({
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(`Failed to update Slack token expiration: ${error.message}`);
    }

    await this.logIntegrationEvent(userId, 'slack', 'auth_refreshed', workspaceId);
  }

  /**
   * Log integration event (audit trail)
   */
  private async logIntegrationEvent(
    userId: string | null,
    integrationType: string,
    action: IntegrationLog['action'],
    resourceId?: string | null,
    details?: Record<string, any>
  ): Promise<void> {
    const { error } = await this.supabase.from('integration_logs').insert({
      user_id: userId,
      integration_type: integrationType,
      action,
      resource_id: resourceId,
      details: details || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log integration event:', error);
      // Don't throw - logging failure shouldn't block main flow
    }
  }

  /**
   * Get integration logs for user
   */
  async getIntegrationLogs(userId: string, limit: number = 50): Promise<IntegrationLog[]> {
    const { data, error } = await this.supabase
      .from('integration_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch integration logs: ${error.message}`);
    }

    return (data || []) as IntegrationLog[];
  }
}
