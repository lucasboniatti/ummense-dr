/**
 * Unit Tests for ExecutionService
 * Story 3.1: Workflow Execution Engine Refactor
 * Target: 95%+ code coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExecutionService } from '../automations/execution/execution.service';
import {
  ExecutionContext,
  ExecutionContextBuilder,
  freezeContext,
} from '../automations/execution/execution-context';
import { WorkflowConfig } from '../db/models/execution.model';

describe('ExecutionService', () => {
  let service: ExecutionService;

  beforeEach(() => {
    service = new ExecutionService();
  });

  describe('Step Handler Registration', () => {
    it('should register and retrieve step handlers', async () => {
      const handler = jest.fn(async () => ({ result: 'test' }));
      service.registerStepHandler('test-step', handler);

      // Handler should be callable via workflow execution
      const workflow: WorkflowConfig = {
        id: 'test-workflow',
        version: 3,
        steps: [{ id: 'step-1', type: 'test-step', config: {} }],
      };

      const result = await service.executeWorkflow(
        workflow,
        'auto-1',
        'user-1',
        'manual',
        {}
      );

      expect(result.execution.status).toBe('success');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Sequential Step Execution', () => {
    it('should execute steps in order', async () => {
      const executionOrder: string[] = [];

      service.registerStepHandler('step-type', async (config, context) => {
        executionOrder.push((config as any).stepNumber);
        return { completed: (config as any).stepNumber };
      });

      const workflow: WorkflowConfig = {
        id: 'sequential-workflow',
        version: 3,
        steps: [
          { id: 'step-1', type: 'step-type', config: { stepNumber: '1' } },
          { id: 'step-2', type: 'step-type', config: { stepNumber: '2' } },
          { id: 'step-3', type: 'step-type', config: { stepNumber: '3' } },
        ],
      };

      const { steps } = await service.executeWorkflow(
        workflow,
        'auto-1',
        'user-1',
        'event',
        { eventType: 'trigger' }
      );

      expect(executionOrder).toEqual(['1', '2', '3']);
      expect(steps).toHaveLength(3);
      expect(steps[0].stepId).toBe('step-1');
      expect(steps[1].stepId).toBe('step-2');
      expect(steps[2].stepId).toBe('step-3');
    });
  });

  describe('Context Passing Between Steps', () => {
    it('should pass context with previous step outputs', async () => {
      const contextSnapshots: ExecutionContext[] = [];

      service.registerStepHandler('collector', async (config, context) => {
        contextSnapshots.push(context);
        return { stepNumber: (config as any).num, received: context.stepOutputs };
      });

      const workflow: WorkflowConfig = {
        id: 'context-workflow',
        version: 3,
        steps: [
          { id: 'step-1', type: 'collector', config: { num: 1 } },
          { id: 'step-2', type: 'collector', config: { num: 2 } },
        ],
      };

      await service.executeWorkflow(workflow, 'auto-1', 'user-1', 'manual', {});

      // Second step should have access to first step's output
      const secondStepContext = contextSnapshots[1];
      expect(secondStepContext.stepOutputs).toHaveProperty('step-1');
      expect(secondStepContext.stepOutputs['step-1']).toEqual({
        stepNumber: 1,
        received: {},
      });
    });
  });

  describe('Error Handling', () => {
    it('should capture errors with full context', async () => {
      service.registerStepHandler('failing-step', async () => {
        throw new Error('Step execution failed');
      });

      const workflow: WorkflowConfig = {
        id: 'error-workflow',
        version: 3,
        steps: [{ id: 'step-1', type: 'failing-step', config: {} }],
      };

      const { execution, steps } = await service.executeWorkflow(
        workflow,
        'auto-1',
        'user-1',
        'event',
        {}
      );

      expect(execution.status).toBe('failed');
      expect(steps[0].status).toBe('failed');
      expect(steps[0].errorMessage).toBe('Step execution failed');
      expect(steps[0].errorContext).toBeDefined();
      expect(steps[0].errorContext?.stack).toBeTruthy();
    });

    it('should handle missing step type handler', async () => {
      const workflow: WorkflowConfig = {
        id: 'no-handler-workflow',
        version: 3,
        steps: [{ id: 'step-1', type: 'unknown-type', config: {} }],
      };

      const { execution, steps } = await service.executeWorkflow(
        workflow,
        'auto-1',
        'user-1',
        'manual',
        {}
      );

      expect(execution.status).toBe('failed');
      expect(steps[0].errorMessage).toContain('No handler registered');
    });
  });

  describe('Context Immutability', () => {
    it('should prevent side effects via freezeContext', async () => {
      service.registerStepHandler('mutation-test', async (config, context) => {
        // Attempt to mutate context (should fail silently or throw)
        try {
          (context as any).automationId = 'modified';
        } catch {
          // Expected: frozen object
        }
        return { attempted: true };
      });

      const workflow: WorkflowConfig = {
        id: 'immutability-test',
        version: 3,
        steps: [{ id: 'step-1', type: 'mutation-test', config: {} }],
      };

      const originalContext = new ExecutionContextBuilder()
        .setAutomationId('auto-1')
        .setExecutionId('exec-1')
        .setUserId('user-1')
        .setTriggerType('manual')
        .setTimestamp(new Date().toISOString())
        .build();

      const frozenContext = freezeContext(originalContext);
      expect(Object.isFrozen(frozenContext)).toBe(true);
    });
  });

  describe('Execution Timing', () => {
    it('should calculate step duration correctly', async () => {
      service.registerStepHandler('slow-step', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { completed: true };
      });

      const workflow: WorkflowConfig = {
        id: 'timing-workflow',
        version: 3,
        steps: [{ id: 'step-1', type: 'slow-step', config: {} }],
      };

      const { steps } = await service.executeWorkflow(
        workflow,
        'auto-1',
        'user-1',
        'manual',
        {}
      );

      expect(steps[0].durationMs).toBeGreaterThanOrEqual(50);
      expect(steps[0].completedAt).toBeTruthy();
      expect(new Date(steps[0].completedAt!).getTime()).toBeGreaterThan(
        new Date(steps[0].startedAt).getTime()
      );
    });
  });

  describe('Error Continuation Policy', () => {
    it('should stop on error when onError=fail', async () => {
      const executedSteps: string[] = [];

      service.registerStepHandler('step-type', async (config) => {
        const stepNum = (config as any).num;
        executedSteps.push(`step-${stepNum}`);

        if (stepNum === 1) {
          throw new Error('Step 1 failed');
        }
        return { step: stepNum };
      });

      const workflow: WorkflowConfig = {
        id: 'error-stop-workflow',
        version: 3,
        steps: [
          { id: 'step-1', type: 'step-type', config: { num: 1 }, onError: 'fail' },
          { id: 'step-2', type: 'step-type', config: { num: 2 }, onError: 'fail' },
        ],
      };

      const { steps } = await service.executeWorkflow(
        workflow,
        'auto-1',
        'user-1',
        'manual',
        {}
      );

      expect(executedSteps).toEqual(['step-1']); // Step 2 should not execute
      expect(steps).toHaveLength(2);
      expect(steps[0].status).toBe('failed');
      expect(steps[1].status).toBe('pending'); // Or skipped
    });

    it('should continue on error when onError=continue', async () => {
      const executedSteps: string[] = [];

      service.registerStepHandler('step-type', async (config) => {
        const stepNum = (config as any).num;
        executedSteps.push(`step-${stepNum}`);

        if (stepNum === 1) {
          throw new Error('Step 1 failed');
        }
        return { step: stepNum };
      });

      const workflow: WorkflowConfig = {
        id: 'error-continue-workflow',
        version: 3,
        steps: [
          { id: 'step-1', type: 'step-type', config: { num: 1 }, onError: 'continue' },
          { id: 'step-2', type: 'step-type', config: { num: 2 }, onError: 'continue' },
        ],
      };

      const { steps } = await service.executeWorkflow(
        workflow,
        'auto-1',
        'user-1',
        'manual',
        {}
      );

      expect(executedSteps).toEqual(['step-1', 'step-2']); // Both execute
      expect(steps[0].status).toBe('failed');
      expect(steps[1].status).toBe('success');
    });
  });

  describe('ExecutionContext Builder', () => {
    it('should build valid context with all required fields', () => {
      const context = new ExecutionContextBuilder()
        .setAutomationId('auto-1')
        .setExecutionId('exec-1')
        .setUserId('user-1')
        .setTriggerType('event')
        .setTriggerData({ eventType: 'webhook' })
        .setTimestamp(new Date().toISOString())
        .build();

      expect(context.automationId).toBe('auto-1');
      expect(context.executionId).toBe('exec-1');
      expect(context.userId).toBe('user-1');
      expect(context.triggerType).toBe('event');
    });

    it('should throw error when required fields are missing', () => {
      const builder = new ExecutionContextBuilder()
        .setAutomationId('auto-1')
        .setExecutionId('exec-1');

      expect(() => builder.build()).toThrow('Missing required field');
    });
  });
});
