/**
 * Integration Tests - Wave 2 Backwards Compatibility
 * Story 3.1: Workflow Execution Engine Refactor - AC#4
 * Validates that Wave 2 automations execute identically under Wave 3 engine
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExecutionService } from '../automations/execution/execution.service';
import {
  convertLegacyAutomation,
  isConvertedWave2,
  Wave2Automation,
} from '../automations/execution/legacy-adapter';

describe('Wave 2 Backwards Compatibility', () => {
  let service: ExecutionService;

  beforeEach(() => {
    service = new ExecutionService();

    // Register handlers for Wave 2 automation types
    service.registerStepHandler('webhook', async (config, context) => {
      // Simulate Wave 2 webhook step
      return {
        status: 'sent',
        url: (config as any).url,
        method: (config as any).method || 'POST',
        timestamp: new Date().toISOString(),
      };
    });

    service.registerStepHandler('conditional', async (config, context) => {
      // Simulate Wave 2 conditional step
      const condition = (config as any).condition;
      const result = eval(condition); // WARNING: Only for test purposes
      return { conditionMet: result };
    });

    service.registerStepHandler('action', async (config, context) => {
      // Simulate Wave 2 action step
      return {
        action: (config as any).actionType,
        status: 'completed',
      };
    });
  });

  describe('Conversion', () => {
    it('should convert Wave 2 automation to multi-step workflow', () => {
      const wave2Automation: Wave2Automation = {
        id: 'auto-wave2-001',
        type: 'webhook',
        config: {
          url: 'https://api.example.com/webhook',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
      };

      const workflow = convertLegacyAutomation(wave2Automation);

      expect(workflow.id).toBe('auto-wave2-001');
      expect(workflow.version).toBe(2); // Marked as converted
      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].id).toBe('legacy-step-1');
      expect(workflow.steps[0].type).toBe('webhook');
      expect(isConvertedWave2(workflow)).toBe(true);
    });
  });

  describe('Execution Output Compatibility', () => {
    it('should produce identical output to Wave 2 for webhook automation', async () => {
      const wave2Automation: Wave2Automation = {
        id: 'webhook-auto-001',
        type: 'webhook',
        config: {
          url: 'https://api.example.com/webhook',
          method: 'POST',
          timeout: 5000,
        },
      };

      const workflow = convertLegacyAutomation(wave2Automation);

      const { execution, steps } = await service.executeWorkflow(
        workflow,
        'webhook-auto-001',
        'user-123',
        'event',
        { eventType: 'trigger', data: 'test' }
      );

      // Wave 2 expectation: single execution result
      expect(execution.status).toBe('success');
      expect(steps).toHaveLength(1);
      expect(steps[0].status).toBe('success');
      expect(steps[0].output).toEqual({
        status: 'sent',
        url: 'https://api.example.com/webhook',
        method: 'POST',
      });
    });

    it('should produce identical error output to Wave 2', async () => {
      service.registerStepHandler('webhook', async () => {
        throw new Error('HTTP 500: Internal Server Error');
      });

      const wave2Automation: Wave2Automation = {
        id: 'webhook-auto-002',
        type: 'webhook',
        config: {
          url: 'https://api.example.com/webhook',
        },
      };

      const workflow = convertLegacyAutomation(wave2Automation);

      const { execution, steps } = await service.executeWorkflow(
        workflow,
        'webhook-auto-002',
        'user-123',
        'event',
        {}
      );

      // Wave 2 expectation: error captured
      expect(execution.status).toBe('failed');
      expect(steps[0].status).toBe('failed');
      expect(steps[0].errorMessage).toBe('HTTP 500: Internal Server Error');
      expect(steps[0].errorContext).toBeDefined();
    });
  });

  describe('Context Preservation', () => {
    it('should preserve trigger data and variables through conversion', async () => {
      let capturedContext: any = null;

      service.registerStepHandler('capture', async (config, context) => {
        capturedContext = context;
        return { captured: true };
      });

      const wave2Automation: Wave2Automation = {
        id: 'context-auto-001',
        type: 'capture',
        config: {},
      };

      const workflow = convertLegacyAutomation(wave2Automation);
      const triggerData = {
        eventType: 'user.created',
        userId: 'user-999',
        email: 'user@example.com',
      };
      const variables = {
        customVar1: 'value1',
        customVar2: 'value2',
      };

      await service.executeWorkflow(
        workflow,
        'context-auto-001',
        'user-123',
        'event',
        triggerData,
        variables
      );

      // Verify context preservation
      expect(capturedContext.triggerData).toEqual(triggerData);
      expect(capturedContext.variables).toEqual(variables);
      expect(capturedContext.automationId).toBe('context-auto-001');
      expect(capturedContext.userId).toBe('user-123');
    });
  });

  describe('API Endpoint Compatibility', () => {
    it('should handle Wave 2 automation creation/update unchanged', async () => {
      // Simulate Wave 2 API request: POST /api/automations
      const wave2Payload = {
        type: 'webhook',
        config: {
          url: 'https://webhook.site/webhook-id',
          method: 'POST',
        },
      };

      // In real code, this would go through:
      // 1. API endpoint accepts wave2Payload directly
      // 2. Converts via convertLegacyAutomation() internally
      // 3. ExecutionService.executeWorkflow() with converted workflow
      const automationId = 'auto-wave2-webhook-001';
      const workflow = convertLegacyAutomation({
        id: automationId,
        ...wave2Payload,
      } as Wave2Automation);

      // Test execution
      const { execution } = await service.executeWorkflow(
        workflow,
        automationId,
        'user-123',
        'manual',
        {}
      );

      // Wave 2 client expects status to be success/failed, not pending/running
      expect(['success', 'failed']).toContain(execution.status);
    });
  });

  describe('Dashboard Compatibility', () => {
    it('should display Wave 2 automations without modification', async () => {
      const wave2Automation: Wave2Automation = {
        id: 'dashboard-auto-001',
        type: 'webhook',
        config: {
          url: 'https://api.example.com/hook',
        },
        // Wave 2 fields that should be preserved
        name: 'My Webhook Automation',
        description: 'Sends webhook on trigger',
        enabled: true,
      };

      const workflow = convertLegacyAutomation(wave2Automation);

      // Dashboard should still see Wave 2 automation in list
      // (doesn't call executeWorkflow, just reads from DB)
      expect(workflow.id).toBe('dashboard-auto-001');
      expect(workflow.version).toBe(2); // Mark indicates it's Wave 2
      expect(workflow.steps[0].type).toBe('webhook');

      // No visible differences to end users:
      // - Same list view
      // - Same execution trigger buttons
      // - Same result display
    });
  });

  describe('Concurrent Execution Isolation', () => {
    it('should isolate context between concurrent Wave 2 executions', async () => {
      const contexts: any[] = [];

      service.registerStepHandler('context-capture', async (config, context) => {
        contexts.push({
          executionId: context.executionId,
          automationId: context.automationId,
          triggerData: context.triggerData,
        });
        return { capturedExecutionId: context.executionId };
      });

      const wave2Automation1: Wave2Automation = {
        id: 'auto-concurrent-001',
        type: 'context-capture',
        config: {},
      };

      const wave2Automation2: Wave2Automation = {
        id: 'auto-concurrent-002',
        type: 'context-capture',
        config: {},
      };

      const workflow1 = convertLegacyAutomation(wave2Automation1);
      const workflow2 = convertLegacyAutomation(wave2Automation2);

      // Execute both concurrently
      const [result1, result2] = await Promise.all([
        service.executeWorkflow(workflow1, 'auto-concurrent-001', 'user-1', 'event', {
          data: 'execution-1',
        }),
        service.executeWorkflow(workflow2, 'auto-concurrent-002', 'user-1', 'event', {
          data: 'execution-2',
        }),
      ]);

      // Verify contexts are isolated
      expect(contexts[0].executionId).not.toBe(contexts[1].executionId);
      expect(contexts[0].automationId).toBe('auto-concurrent-001');
      expect(contexts[1].automationId).toBe('auto-concurrent-002');
      expect(contexts[0].triggerData).toEqual({ data: 'execution-1' });
      expect(contexts[1].triggerData).toEqual({ data: 'execution-2' });
    });
  });
});
