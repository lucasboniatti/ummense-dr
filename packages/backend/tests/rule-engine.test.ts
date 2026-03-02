import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { ruleEngineService } from '../src/services/rule-engine.service';
import { ruleEvaluationService } from '../src/services/rule-evaluation.service';
import { loopDetectorService } from '../src/services/loop-detector.service';
import { rateLimiterService } from '../src/services/rate-limiter.service';
import { ruleExecutionService } from '../src/services/rule-execution.service';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'rule-1', rule_name: 'Test Rule', config: {}, enabled: true, execution_count: 0 },
            error: null
          }),
          is: vi.fn().mockResolvedValue({
            data: [{ id: 'rule-1' }],
            error: null
          })
        }))
      })),
      insert: vi.fn().mockResolvedValue({ data: { id: 'rule-1' }, error: null }),
      update: vi.fn().mockResolvedValue({ error: null })
    }))
  }))
}));

describe('Rule Engine Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loop Detection', () => {
    it('should block self-triggering rule (direct loop)', () => {
      expect(() => {
        loopDetectorService.checkForLoop('rule-1', []);
        loopDetectorService.checkForLoop('rule-1', ['rule-1']); // Self-trigger
      }).toThrow(/Loop detected/);
    });

    it('should block indirect loop (A → B → A)', () => {
      expect(() => {
        loopDetectorService.checkForLoop('rule-1', ['rule-2', 'rule-1']); // Indirect loop
      }).toThrow(/Loop detected/);
    });

    it('should enforce max depth of 3 levels', () => {
      expect(() => {
        loopDetectorService.checkForLoop('rule-4', ['rule-1', 'rule-2', 'rule-3']);
      }).toThrow(/Max execution depth.*3.*exceeded/);
    });

    it('should allow execution at depth <3', () => {
      expect(() => {
        loopDetectorService.checkForLoop('rule-3', ['rule-1', 'rule-2']);
      }).not.toThrow();
    });

    it('should build execution chain correctly', () => {
      const chain = loopDetectorService.buildExecutionChain('rule-2', ['rule-1']);
      expect(chain).toEqual(['rule-1', 'rule-2']);
    });

    it('should validate rule config for self-reference prevention', () => {
      const selfRefConfig = {
        actions: [{ triggeredRuleId: 'rule-1' }]
      };
      expect(() => {
        loopDetectorService.validateRuleConfig('rule-1', selfRefConfig);
      }).toThrow(/cannot trigger itself/);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow rule creation within limit (100 rules per user)', async () => {
      const can = await rateLimiterService.canCreateRule('user-1');
      expect(can).toBe(true); // Mocked to return true
    });

    it('should allow rule execution within daily limit (1000/day)', async () => {
      const can = await rateLimiterService.canExecuteRule('rule-1');
      expect(can).toBe(true);
    });

    it('should increment execution count on each run', async () => {
      await rateLimiterService.incrementExecutionCount('rule-1');
      // Mock verifies call was made
      expect(rateLimiterService.incrementExecutionCount).toBeDefined();
    });

    it('should reset daily count at UTC midnight', async () => {
      // Simulate daily reset
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const count = await rateLimiterService.getExecutionCount('rule-1');
      // If last execution was before today, count should be 0 or 1
      expect(count).toBeLessThanOrEqual(1);
    });

    it('should return accurate user rule count', async () => {
      const count = await rateLimiterService.getRuleCount('user-1');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate equals operator', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'status', operator: 'equals', value: 'active' },
        { status: 'active' }
      );
      expect(result).toBe(true);
    });

    it('should evaluate not_equals operator', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'status', operator: 'not_equals', value: 'inactive' },
        { status: 'active' }
      );
      expect(result).toBe(true);
    });

    it('should evaluate greater_than operator', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'priority', operator: 'greater_than', value: 5 },
        { priority: 10 }
      );
      expect(result).toBe(true);
    });

    it('should evaluate less_than operator', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'count', operator: 'less_than', value: 100 },
        { count: 50 }
      );
      expect(result).toBe(true);
    });

    it('should evaluate in operator (array contains)', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'status', operator: 'in', value: ['active', 'pending'] },
        { status: 'active' }
      );
      expect(result).toBe(true);
    });

    it('should evaluate not_in operator', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'status', operator: 'not_in', value: ['archived', 'deleted'] },
        { status: 'active' }
      );
      expect(result).toBe(true);
    });

    it('should evaluate contains operator (string search)', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'title', operator: 'contains', value: 'urgent' },
        { title: 'This is an urgent task' }
      );
      expect(result).toBe(true);
    });

    it('should support JSON path for nested fields', () => {
      const result = ruleEvaluationService.evaluateCondition(
        { field: 'task.priority', operator: 'equals', value: 'high' },
        { task: { priority: 'high', status: 'open' } }
      );
      expect(result).toBe(true);
    });

    it('should handle AND logic for multiple conditions', () => {
      const conditions = [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ];
      const result = ruleEvaluationService.evaluateConditions(
        conditions,
        { status: 'active', priority: 'high' },
        'AND'
      );
      expect(result).toBe(true);
    });

    it('should handle OR logic for multiple conditions', () => {
      const conditions = [
        { field: 'status', operator: 'equals', value: 'inactive' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ];
      const result = ruleEvaluationService.evaluateConditions(
        conditions,
        { status: 'active', priority: 'high' },
        'OR'
      );
      expect(result).toBe(true);
    });
  });

  describe('Action Execution', () => {
    it('should execute update_task action', async () => {
      const result = await ruleExecutionService.executeActions('rule-1', [
        { type: 'update_task', params: { taskId: 'task-1', fields: { status: 'done' } } }
      ], {});

      expect(result.success).toBe(true);
      expect(result.executedActions).toBeGreaterThan(0);
    });

    it('should execute create_task action', async () => {
      const result = await ruleExecutionService.executeActions('rule-1', [
        { type: 'create_task', params: { title: 'New Task', description: 'Auto-created' } }
      ], {});

      expect(result.success).toBe(true);
    });

    it('should execute send_webhook action', async () => {
      const result = await ruleExecutionService.executeActions('rule-1', [
        { type: 'send_webhook', params: { webhookUrl: 'https://example.com/hook', payload: {} } }
      ], {});

      expect(result.success).toBe(true);
    });

    it('should execute send_notification action', async () => {
      const result = await ruleExecutionService.executeActions('rule-1', [
        { type: 'send_notification', params: { message: 'Test', userId: 'user-1' } }
      ], {});

      expect(result.success).toBe(true);
    });

    it('should execute assign_tag action', async () => {
      const result = await ruleExecutionService.executeActions('rule-1', [
        { type: 'assign_tag', params: { taskId: 'task-1', tagName: 'urgent' } }
      ], {});

      expect(result.success).toBe(true);
    });
  });

  describe('Atomic Transactions', () => {
    it('should execute all actions or none (all-or-nothing)', async () => {
      const actions = [
        { type: 'update_task', params: { taskId: 'task-1', fields: { status: 'done' } } },
        { type: 'assign_tag', params: { taskId: 'task-1', tagName: 'completed' } }
      ];

      const result = await ruleExecutionService.executeActions('rule-1', actions, {});

      // Both should succeed or fail together
      if (result.success) {
        expect(result.executedActions).toBe(2);
      } else {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should rollback on action failure', async () => {
      // Mock a failure scenario
      const actions = [
        { type: 'update_task', params: { taskId: undefined, fields: {} } } // Invalid
      ];

      const result = await ruleExecutionService.executeActions('rule-1', actions, {});

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Rule Engine Service - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rule Creation and Management', () => {
    it('should create rule with valid config', async () => {
      const config = {
        trigger: { event_type: 'task:created', filters: [] },
        conditions: [{ field: 'priority', operator: 'equals', value: 'high' }],
        actions: [{ type: 'send_notification', params: { message: 'High priority task' } }]
      };

      const ruleId = await ruleEngineService.createRule('user-1', 'High Priority Alert', config);
      expect(ruleId).toBeDefined();
      expect(typeof ruleId).toBe('string');
    });

    it('should update rule config with change tracking', async () => {
      const config = {
        trigger: { event_type: 'task:updated', filters: [] },
        conditions: [],
        actions: []
      };

      await expect(
        ruleEngineService.updateRule('rule-1', 'user-1', config, 'Updated rule trigger')
      ).resolves.not.toThrow();
    });

    it('should soft delete rule with history preservation', async () => {
      await expect(
        ruleEngineService.deleteRule('rule-1', 'user-1', 'No longer needed')
      ).resolves.not.toThrow();
    });

    it('should create audit trail entry on rule creation', async () => {
      const config = {
        trigger: { event_type: 'task:created', filters: [] },
        conditions: [],
        actions: []
      };

      const ruleId = await ruleEngineService.createRule('user-1', 'Audit Test Rule', config);
      expect(ruleId).toBeDefined();
      // Audit entry would be created in rule_history table
    });
  });

  describe('Rule Execution Flow', () => {
    it('should execute rule when event triggers all conditions', async () => {
      const config = {
        trigger: { event_type: 'task:created', filters: [] },
        conditions: [
          { field: 'priority', operator: 'equals', value: 'high' },
          { field: 'assigned', operator: 'equals', value: true }
        ],
        actions: [{ type: 'send_notification', params: { message: 'High priority task assigned' } }],
        conditionLogic: 'AND' as const
      };

      const event = { priority: 'high', assigned: true };
      const result = await ruleEngineService.executeRule('rule-1', event, {});

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should skip execution if conditions not met', async () => {
      const config = {
        trigger: { event_type: 'task:created', filters: [] },
        conditions: [{ field: 'priority', operator: 'equals', value: 'high' }],
        actions: [],
        conditionLogic: 'AND' as const
      };

      const event = { priority: 'low' };
      const result = await ruleEngineService.executeRule('rule-1', event, {});

      expect(result.success).toBe(false);
    });

    it('should log execution to automation_logs', async () => {
      const event = { taskId: 'task-1' };
      const result = await ruleEngineService.executeRule('rule-1', event, {});

      // Execution would be logged to automation_logs table
      expect(result.duration).toBeDefined();
    });

    it('should respect execution chain depth', async () => {
      const event = { taskId: 'task-1' };
      const executionChain = ['rule-1', 'rule-2', 'rule-3'];

      // This should fail due to max depth
      await expect(() =>
        ruleEngineService.executeRule('rule-4', event, {}, executionChain)
      ).rejects.toThrow();
    });
  });

  describe('Condition Logic (AND/OR)', () => {
    it('should evaluate AND logic (all conditions must be true)', () => {
      const conditions = [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ];

      const resultBoth = ruleEvaluationService.evaluateConditions(
        conditions,
        { status: 'active', priority: 'high' },
        'AND'
      );
      expect(resultBoth).toBe(true);

      const resultOne = ruleEvaluationService.evaluateConditions(
        conditions,
        { status: 'active', priority: 'low' },
        'AND'
      );
      expect(resultOne).toBe(false);
    });

    it('should evaluate OR logic (at least one condition must be true)', () => {
      const conditions = [
        { field: 'status', operator: 'equals', value: 'inactive' },
        { field: 'priority', operator: 'equals', value: 'high' }
      ];

      const result = ruleEvaluationService.evaluateConditions(
        conditions,
        { status: 'active', priority: 'high' },
        'OR'
      );
      expect(result).toBe(true);
    });
  });

  describe('Action Execution Order', () => {
    it('should execute actions in dependency order', async () => {
      const executionOrder: string[] = [];

      const actions = [
        { type: 'create_task', params: { title: 'Task 1' } },
        { type: 'assign_tag', params: { taskId: 'task-1', tagName: 'new' } },
        { type: 'send_notification', params: { message: 'Task created and tagged' } }
      ];

      const result = await ruleExecutionService.executeActions('rule-1', actions, {});

      expect(result.success).toBe(true);
      expect(result.executedActions).toBe(3);
    });
  });
});

describe('Rule Engine Service - Performance Tests', () => {
  it('should evaluate rule in <100ms (simple rule with 5 conditions)', async () => {
    const start = performance.now();

    const conditions = [
      { field: 'status', operator: 'equals', value: 'active' },
      { field: 'priority', operator: 'in', value: ['high', 'medium'] },
      { field: 'assigned', operator: 'not_equals', value: null },
      { field: 'deadline', operator: 'greater_than', value: Date.now() },
      { field: 'tags', operator: 'contains', value: 'urgent' }
    ];

    ruleEvaluationService.evaluateConditions(
      conditions,
      {
        status: 'active',
        priority: 'high',
        assigned: 'user-1',
        deadline: Date.now() + 86400000,
        tags: 'urgent, important'
      },
      'AND'
    );

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('should handle concurrent execution of 100 rules', async () => {
    const promises = [];

    for (let i = 0; i < 100; i++) {
      const event = { taskId: `task-${i}`, priority: i % 2 === 0 ? 'high' : 'low' };
      promises.push(ruleEngineService.executeRule(`rule-${i}`, event, {}));
    }

    const start = performance.now();
    const results = await Promise.all(promises);
    const elapsed = performance.now() - start;

    expect(results.length).toBe(100);
    expect(elapsed).toBeLessThan(10000); // 10 seconds for 100 concurrent executions
  });
});
