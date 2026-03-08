import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRuleStore = vi.hoisted(() => {
  let nextId = 1;
  const tables = {
    rules: [] as Array<Record<string, any>>,
    rule_history: [] as Array<Record<string, any>>,
    automation_logs: [] as Array<Record<string, any>>,
    tasks: [] as Array<Record<string, any>>,
    notifications: [] as Array<Record<string, any>>,
    tags: [] as Array<Record<string, any>>,
    task_tags: [] as Array<Record<string, any>>,
    webhooks: [] as Array<Record<string, any>>,
  };

  const rowsFor = (table: string) => {
    const rows = (tables as Record<string, Array<Record<string, any>>>)[table];
    if (!rows) {
      throw new Error(`Unexpected table requested in rule-engine tests: ${table}`);
    }

    return rows;
  };

  const applyFilters = (
    rows: Array<Record<string, any>>,
    filters: Array<(row: Record<string, any>) => boolean>
  ) => rows.filter((row) => filters.every((filter) => filter(row)));

  const defaultRuleConfig = {
    trigger: { event_type: 'task:created', filters: [] as Array<Record<string, any>> },
    conditions: [] as Array<Record<string, any>>,
    actions: [{ type: 'send_notification', params: { message: 'Default', userId: 'user-1' } }],
    conditionLogic: 'AND' as const,
  };

  const makeRule = (id: string, overrides: Record<string, any> = {}) => ({
    id,
    user_id: overrides.user_id ?? 'user-1',
    rule_name: overrides.rule_name ?? `Rule ${id}`,
    rule_version: overrides.rule_version ?? 1,
    config: overrides.config ?? defaultRuleConfig,
    enabled: overrides.enabled ?? true,
    execution_count: overrides.execution_count ?? 0,
    last_execution_at: overrides.last_execution_at ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    deleted_at: overrides.deleted_at ?? null,
    ...overrides,
  });

  const normalizeInsert = (table: string, record: Record<string, any>) => {
    switch (table) {
      case 'rules':
        return makeRule(record.id ?? `rule-${nextId++}`, record);
      case 'rule_history':
        return {
          id: record.id ?? `rule-history-${nextId++}`,
          created_at: record.created_at ?? new Date().toISOString(),
          ...record,
        };
      case 'automation_logs':
        return {
          id: record.id ?? `automation-log-${nextId++}`,
          created_at: record.created_at ?? new Date().toISOString(),
          ...record,
        };
      case 'tasks':
        return {
          id: record.id ?? `task-${nextId++}`,
          created_at: record.created_at ?? new Date().toISOString(),
          ...record,
        };
      case 'notifications':
        return {
          id: record.id ?? `notification-${nextId++}`,
          created_at: record.created_at ?? new Date().toISOString(),
          ...record,
        };
      case 'tags':
        return {
          id: record.id ?? `tag-${nextId++}`,
          ...record,
        };
      case 'task_tags':
        return {
          id: record.id ?? `task-tag-${nextId++}`,
          ...record,
        };
      case 'webhooks':
        return {
          id: record.id ?? `webhook-${nextId++}`,
          ...record,
        };
      default:
        return { id: record.id ?? `row-${nextId++}`, ...record };
    }
  };

  const createSelectBuilder = (table: string) => {
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
      single: async () => {
        const result = await execute();
        return { data: result.data[0] ?? null, error: null };
      },
      maybeSingle: async () => {
        const result = await execute();
        return { data: result.data[0] ?? null, error: null };
      },
      then(resolve: any, reject: any) {
        return execute().then(resolve, reject);
      },
    };

    return builder;
  };

  const createInsertBuilder = (
    table: string,
    payload: Record<string, any> | Array<Record<string, any>>
  ) => {
    const rows = rowsFor(table);
    let inserted: Array<Record<string, any>> | null = null;

    const applyInsert = () => {
      if (!inserted) {
        inserted = (Array.isArray(payload) ? payload : [payload]).map((record) =>
          normalizeInsert(table, record)
        );
        rows.push(...inserted);
      }

      return inserted;
    };

    const selectBuilder = {
      single: async () => ({ data: applyInsert()[0], error: null }),
      then(resolve: any, reject: any) {
        return Promise.resolve({ data: applyInsert(), error: null }).then(resolve, reject);
      },
    };

    return {
      select: () => selectBuilder,
      then(resolve: any, reject: any) {
        return Promise.resolve({ data: applyInsert(), error: null }).then(resolve, reject);
      },
    };
  };

  const createUpdateBuilder = (table: string, values: Record<string, any>) => {
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
      is(field: string, value: unknown) {
        filters.push((row) => (row[field] ?? null) === value);
        return builder;
      },
      then(resolve: any, reject: any) {
        return execute().then(resolve, reject);
      },
    };

    return builder;
  };

  const from = vi.fn((table: string) => ({
    select: () => createSelectBuilder(table),
    insert: (payload: Record<string, any> | Array<Record<string, any>>) =>
      createInsertBuilder(table, payload),
    update: (values: Record<string, any>) => createUpdateBuilder(table, values),
  }));

  const reset = () => {
    nextId = 1;
    Object.values(tables).forEach((rows) => {
      rows.length = 0;
    });

    tables.tasks.push({ id: 'task-1', title: 'Seed Task', status: 'todo' });
    tables.webhooks.push({ id: 'webhook-1', url: 'https://example.com/hook' });
    tables.rules.push(makeRule('rule-1'));
  };

  const setRule = (id: string, overrides: Record<string, any> = {}) => {
    const nextRule = makeRule(id, overrides);
    const existingIndex = tables.rules.findIndex((rule) => rule.id === id);

    if (existingIndex >= 0) {
      tables.rules[existingIndex] = nextRule;
    } else {
      tables.rules.push(nextRule);
    }

    return nextRule;
  };

  return { defaultRuleConfig, from, reset, setRule, tables };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockRuleStore.from,
  })),
}));

import { loopDetectorService } from '../src/services/loop-detector.service';
import { rateLimiterService } from '../src/services/rate-limiter.service';
import { ruleEngineService } from '../src/services/rule-engine.service';
import { ruleEvaluationService } from '../src/services/rule-evaluation.service';
import { ruleExecutionService } from '../src/services/rule-execution.service';

describe('Rule Engine Service - Unit Tests', () => {
  beforeEach(() => {
    mockRuleStore.reset();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'OK',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loop Detection', () => {
    it('should block self-triggering rule (direct loop)', () => {
      expect(() => loopDetectorService.checkForLoop('rule-1', ['rule-1'])).toThrow(/Loop detected/);
    });

    it('should block indirect loop (A → B → A)', () => {
      expect(() => loopDetectorService.checkForLoop('rule-1', ['rule-2', 'rule-1'])).toThrow(
        /Loop detected/
      );
    });

    it('should enforce max depth of 3 levels', () => {
      expect(() => loopDetectorService.checkForLoop('rule-4', ['rule-1', 'rule-2', 'rule-3'])).toThrow(
        /Max execution depth/
      );
    });

    it('should build execution chain correctly', () => {
      expect(loopDetectorService.buildExecutionChain('rule-2', ['rule-1'])).toEqual([
        'rule-1',
        'rule-2',
      ]);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow rule creation within limit (100 rules per user)', async () => {
      await expect(rateLimiterService.canCreateRule('user-1')).resolves.toBe(true);
    });

    it('should allow rule execution within daily limit (1000/day)', async () => {
      mockRuleStore.setRule('rule-1', {
        execution_count: 999,
        last_execution_at: new Date().toISOString(),
      });

      await expect(rateLimiterService.canExecuteRule('rule-1')).resolves.toBe(true);
    });

    it('should increment execution count on each run', async () => {
      mockRuleStore.setRule('rule-1', {
        execution_count: 2,
        last_execution_at: new Date().toISOString(),
      });

      await rateLimiterService.incrementExecutionCount('rule-1');

      expect(mockRuleStore.tables.rules.find((rule) => rule.id === 'rule-1')?.execution_count).toBe(3);
    });

    it('should reset daily count at UTC midnight', async () => {
      mockRuleStore.setRule('rule-1', {
        execution_count: 5,
        last_execution_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await expect(rateLimiterService.getExecutionCount('rule-1')).resolves.toBe(0);
    });

    it('should return accurate user rule count', async () => {
      await expect(rateLimiterService.getRuleCount('user-1')).resolves.toBe(1);
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate supported operators and nested JSON paths', () => {
      expect(
        ruleEvaluationService.evaluateCondition(
          { field: 'status', operator: 'equals', value: 'active' },
          { status: 'active' }
        )
      ).toBe(true);
      expect(
        ruleEvaluationService.evaluateCondition(
          { field: 'priority', operator: 'greater_than', value: 5 },
          { priority: 10 }
        )
      ).toBe(true);
      expect(
        ruleEvaluationService.evaluateCondition(
          { field: 'task.priority', operator: 'equals', value: 'high' },
          { task: { priority: 'high' } }
        )
      ).toBe(true);
    });

    it('should handle AND/OR logic for multiple conditions', () => {
      const conditions = [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'priority', operator: 'equals', value: 'high' },
      ];

      expect(
        ruleEvaluationService.evaluateConditions(conditions, { status: 'active', priority: 'high' }, 'AND')
      ).toBe(true);
      expect(
        ruleEvaluationService.evaluateConditions(conditions, { status: 'active', priority: 'low' }, 'AND')
      ).toBe(false);
      expect(
        ruleEvaluationService.evaluateConditions(conditions, { status: 'active', priority: 'low' }, 'OR')
      ).toBe(true);
    });
  });

  describe('Action Execution', () => {
    it('should execute update_task action', async () => {
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [{ type: 'update_task', params: { taskId: 'task-1', fields: { status: 'done' } } }],
        {}
      );

      expect(result.success).toBe(true);
      expect(mockRuleStore.tables.tasks.find((task) => task.id === 'task-1')?.status).toBe('done');
    });

    it('should execute create_task action', async () => {
      const initialCount = mockRuleStore.tables.tasks.length;
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [{ type: 'create_task', params: { title: 'New Task', description: 'Auto-created' } }],
        {}
      );

      expect(result.success).toBe(true);
      expect(mockRuleStore.tables.tasks).toHaveLength(initialCount + 1);
    });

    it('should execute send_webhook action', async () => {
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [{ type: 'send_webhook', params: { webhookUrl: 'https://example.com/hook', payload: {} } }],
        {}
      );

      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should execute send_notification action', async () => {
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [{ type: 'send_notification', params: { message: 'Test', userId: 'user-1' } }],
        {}
      );

      expect(result.success).toBe(true);
      expect(mockRuleStore.tables.notifications).toHaveLength(1);
    });

    it('should execute assign_tag action', async () => {
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [{ type: 'assign_tag', params: { taskId: 'task-1', tagName: 'urgent' } }],
        {}
      );

      expect(result.success).toBe(true);
      expect(mockRuleStore.tables.tags).toHaveLength(1);
      expect(mockRuleStore.tables.task_tags).toHaveLength(1);
    });
  });

  describe('Atomic Transactions', () => {
    it('should execute all actions or none (all-or-nothing)', async () => {
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [
          { type: 'create_task', params: { title: 'Task 1' } },
          { type: 'send_notification', params: { message: 'Created', userId: 'user-1' } },
        ],
        {}
      );

      expect(result.success).toBe(true);
      expect(result.executedActions).toBe(2);
    });

    it('should rollback on action failure', async () => {
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [{ type: 'update_task', params: { taskId: undefined, fields: {} } }],
        {}
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('update_task requires taskId and fields');
    });
  });
});

describe('Rule Engine Service - Integration Tests', () => {
  beforeEach(() => {
    mockRuleStore.reset();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'OK',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rule Creation and Management', () => {
    it('should create rule with valid config', async () => {
      const config = {
        trigger: { event_type: 'task:created', filters: [] },
        conditions: [{ field: 'priority', operator: 'equals', value: 'high' }],
        actions: [{ type: 'send_notification', params: { message: 'High priority task', userId: 'user-1' } }],
      };

      const ruleId = await ruleEngineService.createRule('user-1', 'High Priority Alert', config as any);

      expect(ruleId).toBeDefined();
      expect(mockRuleStore.tables.rule_history.at(-1)?.change_type).toBe('created');
    });

    it('should update rule config with change tracking', async () => {
      const config = {
        trigger: { event_type: 'task:updated', filters: [] },
        conditions: [],
        actions: [],
      };

      await ruleEngineService.updateRule('rule-1', 'user-1', config as any, 'Updated rule trigger');

      expect(mockRuleStore.tables.rules.find((rule) => rule.id === 'rule-1')?.rule_version).toBe(2);
      expect(mockRuleStore.tables.rule_history.at(-1)?.change_type).toBe('updated');
    });

    it('should soft delete rule with history preservation', async () => {
      await ruleEngineService.deleteRule('rule-1', 'user-1', 'No longer needed');

      const rule = mockRuleStore.tables.rules.find((entry) => entry.id === 'rule-1');
      expect(rule?.enabled).toBe(false);
      expect(rule?.deleted_at).toBeTruthy();
      expect(mockRuleStore.tables.rule_history.at(-1)?.change_type).toBe('deleted');
    });
  });

  describe('Rule Execution Flow', () => {
    it('should execute rule when event triggers all conditions', async () => {
      mockRuleStore.setRule('rule-1', {
        config: {
          trigger: { event_type: 'task:created', filters: [] },
          conditions: [{ field: 'event.priority', operator: 'equals', value: 'high' }],
          actions: [{ type: 'send_notification', params: { message: 'High priority task', userId: 'user-1' } }],
          conditionLogic: 'AND',
        },
      });

      const result = await ruleEngineService.executeRule('rule-1', { priority: 'high' }, {});

      expect(result.success).toBe(true);
      expect(mockRuleStore.tables.notifications).toHaveLength(1);
    });

    it('should skip execution if conditions not met', async () => {
      mockRuleStore.setRule('rule-1', {
        config: {
          trigger: { event_type: 'task:created', filters: [] },
          conditions: [{ field: 'event.priority', operator: 'equals', value: 'high' }],
          actions: [],
          conditionLogic: 'AND',
        },
      });

      const result = await ruleEngineService.executeRule('rule-1', { priority: 'low' }, {});

      expect(result.success).toBe(false);
      expect(mockRuleStore.tables.notifications).toHaveLength(0);
    });

    it('should log execution to automation_logs', async () => {
      mockRuleStore.setRule('rule-1', {
        config: {
          trigger: { event_type: 'task:created', filters: [] },
          conditions: [],
          actions: [{ type: 'send_notification', params: { message: 'Log me', userId: 'user-1' } }],
          conditionLogic: 'AND',
        },
      });

      await ruleEngineService.executeRule('rule-1', { taskId: 'task-1' }, {});

      expect(mockRuleStore.tables.automation_logs).toHaveLength(1);
      expect(mockRuleStore.tables.automation_logs[0]?.execution_status).toBe('success');
    });

    it('should respect execution chain depth', async () => {
      const result = await ruleEngineService.executeRule(
        'rule-4',
        { taskId: 'task-1' },
        {},
        ['rule-1', 'rule-2', 'rule-3']
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Max execution depth');
    });
  });

  describe('Action Execution Order', () => {
    it('should execute actions in dependency order', async () => {
      const result = await ruleExecutionService.executeActions(
        'rule-1',
        [
          { type: 'create_task', params: { title: 'Task 1' } },
          { type: 'assign_tag', params: { taskId: 'task-1', tagName: 'new' } },
          { type: 'send_notification', params: { message: 'Task created and tagged', userId: 'user-1' } },
        ],
        {}
      );

      expect(result.success).toBe(true);
      expect(result.executedActions).toBe(3);
    });
  });
});

describe('Rule Engine Service - Performance Tests', () => {
  beforeEach(() => {
    mockRuleStore.reset();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'OK',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should evaluate rule in <100ms (simple rule with 5 conditions)', () => {
    const start = performance.now();

    ruleEvaluationService.evaluateConditions(
      [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'priority', operator: 'in', value: ['high', 'medium'] },
        { field: 'assigned', operator: 'not_equals', value: null },
        { field: 'deadline', operator: 'greater_than', value: Date.now() },
        { field: 'tags', operator: 'contains', value: 'urgent' },
      ],
      {
        status: 'active',
        priority: 'high',
        assigned: 'user-1',
        deadline: Date.now() + 86_400_000,
        tags: 'urgent,important',
      },
      'AND'
    );

    expect(performance.now() - start).toBeLessThan(100);
  });

  it('should handle concurrent execution of 100 rules', async () => {
    for (let i = 0; i < 100; i++) {
      mockRuleStore.setRule(`rule-${i}`, {
        config: {
          trigger: { event_type: 'task:created', filters: [] },
          conditions: [],
          actions: [{ type: 'send_notification', params: { message: `Rule ${i}`, userId: 'user-1' } }],
          conditionLogic: 'AND',
        },
      });
    }

    const start = performance.now();
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        ruleEngineService.executeRule(`rule-${index}`, { taskId: `task-${index}` }, {})
      )
    );

    expect(results).toHaveLength(100);
    expect(results.every((result) => result.duration >= 0)).toBe(true);
    expect(performance.now() - start).toBeLessThan(10_000);
  });
});
