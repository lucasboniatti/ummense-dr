import express from 'express';
import { AddressInfo } from 'node:net';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSavedFiltersRoutes } from '../automations/history/saved-filters.routes';
import { SavedFiltersService } from '../automations/history/saved-filters.service';

describe('Saved filters routes', () => {
  let db: FakeSupabaseClient;
  let service: SavedFiltersService;
  let app: express.Express;

  beforeEach(() => {
    db = new FakeSupabaseClient();
    service = new SavedFiltersService(db as any);
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as express.Request & { user?: { id: string } }).user = { id: 'user-1' };
      next();
    });
    app.use('/api/users', createSavedFiltersRoutes(service));
  });

  it('GET /api/users/saved-filters seeds and returns default presets', async () => {
    const response = await makeRequest(app, '/api/users/saved-filters');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body.map((preset: any) => preset.name)).toEqual([
      'Failed Executions (24h)',
      'Timeout Errors',
      'Recent Executions',
    ]);
    expect(response.body.every((preset: any) => preset.is_default)).toBe(true);
  });

  it('POST creates a custom preset and GET lists it alongside defaults', async () => {
    const createResponse = await makeRequest(app, '/api/users/saved-filters', {
      method: 'POST',
      body: {
        name: 'Falhas com timeout',
        description: 'Busca por timeout nas falhas mais recentes',
        filter_json: {
          status: 'failed',
          searchTerm: 'timeout',
          dateRange: '24h',
        },
      },
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe('Falhas com timeout');
    expect(createResponse.body.is_default).toBe(false);

    const listResponse = await makeRequest(app, '/api/users/saved-filters');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(4);
    expect(listResponse.body.some((preset: any) => preset.name === 'Falhas com timeout')).toBe(
      true
    );
  });

  it('DELETE performs soft-delete and removes preset from active list', async () => {
    const createResponse = await makeRequest(app, '/api/users/saved-filters', {
      method: 'POST',
      body: {
        name: 'Minha busca favorita',
        filter_json: {
          status: 'failed',
          dateRange: '7d',
        },
      },
    });

    const deleteResponse = await makeRequest(
      app,
      `/api/users/saved-filters/${createResponse.body.id}`,
      { method: 'DELETE' }
    );

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({ success: true });

    const listResponse = await makeRequest(app, '/api/users/saved-filters');
    expect(listResponse.body.some((preset: any) => preset.id === createResponse.body.id)).toBe(
      false
    );

    const deletedRecord = db.tables.user_saved_filters.find(
      (preset) => preset.id === createResponse.body.id
    );
    expect(deletedRecord?.deleted_at).toBeTruthy();
  });

  it('DELETE rejects default presets', async () => {
    const listResponse = await makeRequest(app, '/api/users/saved-filters');
    const defaultPreset = listResponse.body[0];

    const deleteResponse = await makeRequest(
      app,
      `/api/users/saved-filters/${defaultPreset.id}`,
      { method: 'DELETE' }
    );

    expect(deleteResponse.status).toBe(400);
    expect(deleteResponse.body.error).toContain('padrao');
  });

  it('POST enforces the maximum of 20 custom presets per user', async () => {
    for (let index = 0; index < 20; index += 1) {
      const response = await makeRequest(app, '/api/users/saved-filters', {
        method: 'POST',
        body: {
          name: `Preset ${index + 1}`,
          filter_json: {
            status: 'failed',
          },
        },
      });

      expect(response.status).toBe(201);
    }

    const overflowResponse = await makeRequest(app, '/api/users/saved-filters', {
      method: 'POST',
      body: {
        name: 'Preset 21',
        filter_json: {
          status: 'failed',
        },
      },
    });

    expect(overflowResponse.status).toBe(409);
    expect(overflowResponse.body.error).toContain('Maximo');
  });

  it('allows reusing the same preset name after soft-delete', async () => {
    const createResponse = await makeRequest(app, '/api/users/saved-filters', {
      method: 'POST',
      body: {
        name: 'Reutilizavel',
        filter_json: {
          searchTerm: 'timeout',
        },
      },
    });

    expect(createResponse.status).toBe(201);

    const deleteResponse = await makeRequest(
      app,
      `/api/users/saved-filters/${createResponse.body.id}`,
      { method: 'DELETE' }
    );
    expect(deleteResponse.status).toBe(200);

    const recreateResponse = await makeRequest(app, '/api/users/saved-filters', {
      method: 'POST',
      body: {
        name: 'Reutilizavel',
        filter_json: {
          searchTerm: 'timeout',
          status: 'failed',
        },
      },
    });

    expect(recreateResponse.status).toBe(201);
  });

  it('returns 401 when the request has no authenticated user', async () => {
    const anonymousApp = express();
    anonymousApp.use(express.json());
    anonymousApp.use('/api/users', createSavedFiltersRoutes(service));

    const response = await makeRequest(anonymousApp, '/api/users/saved-filters');

    expect(response.status).toBe(401);
  });
});

type SavedFilterRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  filter_json: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  deleted_at: string | null;
};

class FakeSupabaseClient {
  private idCounter = 0;

  public tables: {
    user_saved_filters: SavedFilterRow[];
  } = {
    user_saved_filters: [],
  };

  from(tableName: 'user_saved_filters') {
    return new FakeQueryBuilder(this, tableName);
  }

  nextId() {
    this.idCounter += 1;
    return `preset-${this.idCounter}`;
  }
}

class FakeQueryBuilder {
  private action: 'select' | 'insert' | 'update' = 'select';
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private filters: Array<(row: SavedFilterRow) => boolean> = [];
  private orders: Array<{ column: keyof SavedFilterRow; ascending: boolean }> = [];
  private selectOptions: { count?: 'exact'; head?: boolean } | undefined;
  private expectSingle: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly tableName: 'user_saved_filters'
  ) {}

  select(_columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectOptions = options;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  eq(column: keyof SavedFilterRow, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  is(column: keyof SavedFilterRow, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  ilike(column: keyof SavedFilterRow, value: string) {
    const normalized = value.toLowerCase();
    this.filters.push((row) => String(row[column]).toLowerCase() === normalized);
    return this;
  }

  order(column: keyof SavedFilterRow, options?: { ascending?: boolean }) {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  single() {
    this.expectSingle = 'single';
    return this;
  }

  maybeSingle() {
    this.expectSingle = 'maybeSingle';
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute() {
    const rows = this.client.tables[this.tableName];

    if (this.action === 'insert') {
      const insertedRows = toArray(this.payload).map((rawRow) => {
        const row = rawRow as Partial<SavedFilterRow>;
        const duplicate = rows.find(
          (current) =>
            current.user_id === row.user_id &&
            current.deleted_at === null &&
            current.name.toLowerCase() === String(row.name || '').toLowerCase()
        );

        if (duplicate) {
          return { error: { code: '23505', message: 'duplicate key value' } };
        }

        const createdRow: SavedFilterRow = {
          id: this.client.nextId(),
          user_id: String(row.user_id),
          name: String(row.name),
          description: row.description ? String(row.description) : null,
          filter_json: (row.filter_json || {}) as Record<string, unknown>,
          is_default: Boolean(row.is_default),
          created_at: new Date().toISOString(),
          deleted_at: row.deleted_at ? String(row.deleted_at) : null,
        };

        rows.push(createdRow);
        return { data: createdRow };
      });

      const failedInsert = insertedRows.find((entry) => 'error' in entry);
      if (failedInsert && 'error' in failedInsert) {
        return { data: null, error: failedInsert.error };
      }

      const created = insertedRows
        .filter((entry): entry is { data: SavedFilterRow } => 'data' in entry)
        .map((entry) => entry.data);

      return this.finish(created);
    }

    const filteredRows = this.applyFilters(rows);

    if (this.action === 'update') {
      const updates = (this.payload || {}) as Partial<SavedFilterRow>;
      filteredRows.forEach((row) => {
        Object.assign(row, updates);
      });

      return { data: filteredRows.map(cloneRow), error: null, count: filteredRows.length };
    }

    return this.finish(filteredRows.map(cloneRow));
  }

  private finish(rows: SavedFilterRow[]) {
    const orderedRows = [...rows];

    for (const order of this.orders) {
      orderedRows.sort((left, right) => {
        const leftValue = left[order.column];
        const rightValue = right[order.column];

        if (leftValue === rightValue) {
          return 0;
        }

        if (leftValue === null) {
          return order.ascending ? -1 : 1;
        }

        if (rightValue === null) {
          return order.ascending ? 1 : -1;
        }

        if (leftValue < rightValue) {
          return order.ascending ? -1 : 1;
        }

        return order.ascending ? 1 : -1;
      });
    }

    if (this.expectSingle === 'single') {
      if (orderedRows.length !== 1) {
        return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
      }

      return { data: orderedRows[0], error: null };
    }

    if (this.expectSingle === 'maybeSingle') {
      return { data: orderedRows[0] || null, error: null };
    }

    if (this.selectOptions?.head) {
      return {
        data: null,
        error: null,
        count: this.selectOptions.count === 'exact' ? orderedRows.length : null,
      };
    }

    return {
      data: orderedRows,
      error: null,
      count: this.selectOptions?.count === 'exact' ? orderedRows.length : null,
    };
  }

  private applyFilters(rows: SavedFilterRow[]) {
    return rows.filter((row) => this.filters.every((predicate) => predicate(row)));
  }
}

function toArray<T>(value: T | T[] | null): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function cloneRow(row: SavedFilterRow): SavedFilterRow {
  return JSON.parse(JSON.stringify(row)) as SavedFilterRow;
}

async function makeRequest(
  app: express.Express,
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: Record<string, unknown>;
  }
) {
  const server = await new Promise<ReturnType<express.Express['listen']>>((resolve) => {
    const startedServer = app.listen(0, () => resolve(startedServer));
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: options?.method || 'GET',
    headers: options?.body
      ? {
          'Content-Type': 'application/json',
        }
      : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await response.json().catch(() => null);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return {
    status: response.status,
    body,
  };
}
