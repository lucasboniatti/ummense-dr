import { beforeEach, describe, expect, it, vi } from 'vitest';

const tokenStore = vi.hoisted(() => {
  let nextId = 1;
  const tables = {
    discord_tokens: [] as Array<Record<string, any>>,
    integration_logs: [] as Array<Record<string, any>>,
  };

  const rowsFor = (table: string) => {
    const rows = (tables as Record<string, Array<Record<string, any>>>)[table];
    if (!rows) {
      throw new Error(`Unexpected table: ${table}`);
    }

    return rows;
  };

  const applyFilters = (
    rows: Array<Record<string, any>>,
    filters: Array<(row: Record<string, any>) => boolean>
  ) => rows.filter((row) => filters.every((filter) => filter(row)));

  const reset = () => {
    nextId = 1;
    Object.values(tables).forEach((rows) => {
      rows.length = 0;
    });
  };

  const from = vi.fn((table: string) => ({
    upsert: (payload: Record<string, any>, options?: { onConflict?: string }) => {
      const rows = rowsFor(table);
      const onConflictFields = (options?.onConflict || '')
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean);

      const existingIndex = rows.findIndex((row) =>
        onConflictFields.every((field) => row[field] === payload[field])
      );

      const record = {
        id: existingIndex >= 0 ? rows[existingIndex].id : `${table}-${nextId++}`,
        created_at:
          existingIndex >= 0 ? rows[existingIndex].created_at : new Date().toISOString(),
        updated_at: payload.updated_at || new Date().toISOString(),
        deleted_at: payload.deleted_at ?? null,
        ...payload,
      };

      if (existingIndex >= 0) {
        rows[existingIndex] = record;
      } else {
        rows.push(record);
      }

      return {
        select: () => ({
          single: async () => ({ data: record, error: null }),
        }),
      };
    },
    insert: (payload: Record<string, any>) => {
      const rows = rowsFor(table);
      const record = {
        id: `${table}-${nextId++}`,
        created_at: new Date().toISOString(),
        ...payload,
      };
      rows.push(record);

      return {
        single: async () => ({ data: record, error: null }),
      };
    },
    select: () => {
      const rows = rowsFor(table);
      const filters: Array<(row: Record<string, any>) => boolean> = [];

      const execute = async () => ({ data: applyFilters(rows, filters), error: null });
      const builder: any = {
        eq(field: string, value: unknown) {
          filters.push((row) => row[field] === value);
          return builder;
        },
        is(field: string, value: unknown) {
          filters.push((row) => (row[field] ?? null) === value);
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        single: async () => {
          const result = await execute();
          return { data: result.data[0] ?? null, error: null };
        },
        then(resolve: any, reject: any) {
          return execute().then(resolve, reject);
        },
      };

      return builder;
    },
    update: (values: Record<string, any>) => {
      const rows = rowsFor(table);
      const filters: Array<(row: Record<string, any>) => boolean> = [];

      const execute = async () => {
        const updated = applyFilters(rows, filters).map((row) => {
          Object.assign(row, values);
          return row;
        });

        return { data: updated, error: null };
      };

      const builder: any = {
        eq(field: string, value: unknown) {
          filters.push((row) => row[field] === value);
          return builder;
        },
        then(resolve: any, reject: any) {
          return execute().then(resolve, reject);
        },
      };

      return builder;
    },
  }));

  return { from, reset, tables };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: tokenStore.from,
  })),
}));

vi.mock('aws-sdk', () => ({
  KMS: class {
    encrypt({ Plaintext }: { Plaintext: Buffer }) {
      return {
        promise: async () => ({
          CiphertextBlob: Buffer.from(Plaintext),
        }),
      };
    }

    decrypt({ CiphertextBlob }: { CiphertextBlob: Buffer }) {
      return {
        promise: async () => ({
          Plaintext: Buffer.from(CiphertextBlob),
        }),
      };
    }
  },
}));

import { IntegrationTokenService } from '../src/services/integration-token.service';

describe('IntegrationTokenService', () => {
  beforeEach(() => {
    process.env.KMS_KEY_ID = 'kms-key-id';
    tokenStore.reset();
  });

  it('should store, decrypt, list, and soft-delete Discord tokens', async () => {
    const service = new IntegrationTokenService();

    await service.storeDiscordToken(
      'user-123',
      'guild-123',
      'discord-secret-token',
      'kms-key-id',
      ['chat.write'],
      {
        tokenType: 'Bearer',
        guildName: 'Ummense Guild',
        expiresAt: new Date('2026-03-09T00:00:00.000Z'),
      }
    );

    expect(tokenStore.tables.discord_tokens).toHaveLength(1);
    expect(tokenStore.tables.discord_tokens[0]?.encrypted_token).not.toBe('discord-secret-token');

    const token = await service.getDiscordToken('user-123', 'guild-123');
    const tokenRecord = await service.getDiscordTokenRecord('user-123', 'guild-123');
    const integrations = await service.listDiscordTokens('user-123');

    expect(token).toBe('discord-secret-token');
    expect(tokenRecord).toEqual({
      token: 'discord-secret-token',
      tokenType: 'Bearer',
    });
    expect(integrations).toEqual([
      expect.objectContaining({
        guild_id: 'guild-123',
        guild_name: 'Ummense Guild',
        token_type: 'Bearer',
      }),
    ]);

    await service.deleteDiscordToken('user-123', 'guild-123');

    expect(tokenStore.tables.discord_tokens[0]?.deleted_at).toBeTruthy();
    expect(tokenStore.tables.integration_logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ integration_type: 'discord', action: 'created' }),
        expect.objectContaining({ integration_type: 'discord', action: 'deleted' }),
      ])
    );
  });
});
