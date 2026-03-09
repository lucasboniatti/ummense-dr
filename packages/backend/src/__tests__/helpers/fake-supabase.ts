type TableName =
  | 'execution_histories'
  | 'user_retention_policies'
  | 'cost_snapshots'
  | 'automations';

type Row = Record<string, any>;

export class FakeSupabaseClient {
  private idCounter = 0;

  public tables: Record<TableName, Row[]> = {
    execution_histories: [],
    user_retention_policies: [],
    cost_snapshots: [],
    automations: [],
  };

  from(tableName: TableName) {
    return new FakeQueryBuilder(this, tableName);
  }

  nextId(prefix: string) {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }
}

class FakeQueryBuilder {
  private action: 'select' | 'insert' = 'select';
  private payload: Row | Row[] | null = null;
  private filters: Array<(row: Row) => boolean> = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private selectOptions: { count?: 'exact'; head?: boolean } | undefined;
  private expectSingle: 'none' | 'single' | 'maybeSingle' = 'none';
  private limitCount: number | undefined;

  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly tableName: TableName
  ) {}

  select(_columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectOptions = options;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push((row) => row[column] < value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
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
      const createdRows = toArray(this.payload).map((input) =>
        normalizeInsertRow(this.client, this.tableName, input)
      );
      rows.push(...createdRows);
      return this.finish(createdRows);
    }

    return this.finish(rows.filter((row) => this.filters.every((predicate) => predicate(row))));
  }

  private finish(rows: Row[]) {
    const ordered = [...rows];

    for (const order of this.orders) {
      ordered.sort((left, right) => {
        const leftValue = left[order.column];
        const rightValue = right[order.column];

        if (leftValue === rightValue) return 0;
        if (leftValue === null || leftValue === undefined) return order.ascending ? -1 : 1;
        if (rightValue === null || rightValue === undefined) return order.ascending ? 1 : -1;
        return leftValue < rightValue
          ? order.ascending
            ? -1
            : 1
          : order.ascending
            ? 1
            : -1;
      });
    }

    const limited = this.limitCount !== undefined ? ordered.slice(0, this.limitCount) : ordered;

    if (this.selectOptions?.head) {
      return {
        data: null,
        error: null,
        count: this.selectOptions.count === 'exact' ? limited.length : null,
      };
    }

    if (this.expectSingle === 'single') {
      if (limited.length !== 1) {
        return {
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        };
      }

      return {
        data: clone(limited[0]),
        error: null,
      };
    }

    if (this.expectSingle === 'maybeSingle') {
      return {
        data: limited.length > 0 ? clone(limited[0]) : null,
        error: null,
      };
    }

    return {
      data: limited.map((row) => clone(row)),
      error: null,
      count: this.selectOptions?.count === 'exact' ? limited.length : null,
    };
  }
}

function normalizeInsertRow(
  client: FakeSupabaseClient,
  tableName: TableName,
  input: Row
): Row {
  const base = clone(input);

  if (!base.id) {
    const prefix =
      tableName === 'cost_snapshots'
        ? 'snapshot'
        : tableName === 'execution_histories'
          ? 'execution'
          : tableName === 'automations'
            ? 'automation'
            : 'row';
    base.id = client.nextId(prefix);
  }

  if (tableName === 'cost_snapshots' && !base.timestamp) {
    base.timestamp = new Date().toISOString();
  }

  return base;
}

function toArray<T>(value: T | T[] | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
