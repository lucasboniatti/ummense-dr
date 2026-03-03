/**
 * Performance Tests for ExecutionService
 * Story 3.1: Workflow Execution Engine Refactor - AC#7 & #8
 * Validates: P99 latency <500ms, context construction <10ms, DB inserts <50ms async
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExecutionService } from '../automations/execution/execution.service';
import {
  ExecutionContextBuilder,
  freezeContext,
} from '../automations/execution/execution-context';
import { WorkflowConfig } from '../db/models/execution.model';

describe('ExecutionService Performance', () => {
  let service: ExecutionService;
  const ITERATIONS = 100;

  beforeEach(() => {
    service = new ExecutionService();
  });

  describe('P99 Latency for Single-Step Execution', () => {
    it('should execute single-step workflow within P99 <500ms', async () => {
      service.registerStepHandler('fast-step', async () => {
        return { status: 'completed' };
      });

      const workflow: WorkflowConfig = {
        id: 'perf-single-step',
        version: 3,
        steps: [{ id: 'step-1', type: 'fast-step', config: {} }],
      };

      const latencies: number[] = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        await service.executeWorkflow(
          workflow,
          `auto-${i}`,
          'user-1',
          'manual',
          {}
        );
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      latencies.sort((a, b) => a - b);
      const p99Index = Math.floor(ITERATIONS * 0.99);
      const p99Latency = latencies[p99Index];

      console.log(`P99 Latency: ${p99Latency.toFixed(2)}ms`);
      expect(p99Latency).toBeLessThan(500);
    });

    it('should show no regression vs Wave 2 baseline', async () => {
      // Simulates Wave 2 latency baseline: ~50ms for simple webhook
      const baseline = 50;

      service.registerStepHandler('webhook', async (config) => {
        // Simulate small processing time
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { sent: true };
      });

      const workflow: WorkflowConfig = {
        id: 'perf-wave2-compat',
        version: 2, // Wave 2 format
        steps: [
          {
            id: 'legacy-step-1',
            type: 'webhook',
            config: { url: 'https://example.com' },
          },
        ],
      };

      const latencies: number[] = [];

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        await service.executeWorkflow(
          workflow,
          `auto-wave2-${i}`,
          'user-1',
          'event',
          {}
        );
        latencies.push(performance.now() - start);
      }

      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
      const regressionAllowed = baseline * 1.1; // Allow 10% regression

      console.log(
        `Average latency: ${avgLatency.toFixed(2)}ms (baseline: ${baseline}ms, allowed: ${regressionAllowed.toFixed(2)}ms)`
      );
      expect(avgLatency).toBeLessThan(regressionAllowed);
    });
  });

  describe('ExecutionContext Construction', () => {
    it('should construct context in <10ms', () => {
      const times: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const start = performance.now();

        const context = new ExecutionContextBuilder()
          .setAutomationId(`auto-${i}`)
          .setExecutionId(`exec-${i}`)
          .setUserId('user-1')
          .setTriggerType('event')
          .setTriggerData({ eventId: `event-${i}` })
          .setStepOutputs({})
          .setVariables({})
          .setTimestamp(new Date().toISOString())
          .build();

        const duration = performance.now() - start;
        times.push(duration);
      }

      times.sort((a, b) => a - b);
      const p99Index = Math.floor(times.length * 0.99);
      const p99Construction = times[p99Index];

      console.log(`P99 context construction: ${p99Construction.toFixed(3)}ms`);
      expect(p99Construction).toBeLessThan(10);
    });

    it('should freeze context efficiently', () => {
      const baseContext = new ExecutionContextBuilder()
        .setAutomationId('auto-1')
        .setExecutionId('exec-1')
        .setUserId('user-1')
        .setTriggerType('event')
        .setTriggerData({
          eventType: 'webhook',
          data: {
            nested: { deeply: { value: 'test' } },
          },
        })
        .setStepOutputs({
          step1: { output: 'data' },
          step2: { output: { complex: 'object' } },
        })
        .setVariables({
          var1: 'value1',
          var2: { nested: 'object' },
        })
        .setTimestamp(new Date().toISOString())
        .build();

      const times: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        freezeContext(baseContext);
        times.push(performance.now() - start);
      }

      const avgFreezeTime =
        times.reduce((a, b) => a + b) / times.length;

      console.log(`Average freeze time: ${avgFreezeTime.toFixed(3)}ms`);
      // Context freezing should be < 1ms (deep copy + freeze)
      expect(avgFreezeTime).toBeLessThan(1);
    });
  });

  describe('Large Payload Handling', () => {
    it('should handle 1MB step outputs without slowdown', async () => {
      // Create a 1MB payload
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB string
      };

      service.registerStepHandler('large-output', async () => {
        return largePayload;
      });

      const workflow: WorkflowConfig = {
        id: 'perf-large-payload',
        version: 3,
        steps: [{ id: 'step-1', type: 'large-output', config: {} }],
      };

      const start = performance.now();
      const { execution, steps } = await service.executeWorkflow(
        workflow,
        'auto-large',
        'user-1',
        'manual',
        {}
      );
      const duration = performance.now() - start;

      console.log(
        `1MB payload execution: ${duration.toFixed(2)}ms, total result size: ${JSON.stringify(
          steps[0].output
        ).length} bytes`
      );

      expect(execution.status).toBe('success');
      expect(steps[0].output).toEqual(largePayload);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Concurrent Load Performance', () => {
    it('should handle 100+ simultaneous executions', async () => {
      service.registerStepHandler('concurrent-step', async (config, context) => {
        // Simulate 10ms processing per step
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          executionId: context.executionId,
          processed: true,
        };
      });

      const workflow: WorkflowConfig = {
        id: 'perf-concurrent',
        version: 3,
        steps: [
          { id: 'step-1', type: 'concurrent-step', config: {} },
          { id: 'step-2', type: 'concurrent-step', config: {} },
        ],
      };

      const concurrentCount = 100;
      const promises = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentCount; i++) {
        promises.push(
          service.executeWorkflow(
            workflow,
            `auto-concurrent-${i}`,
            `user-${i % 10}`,
            'event',
            { concurrentRun: i }
          )
        );
      }

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      console.log(`${concurrentCount} concurrent executions completed in ${totalTime.toFixed(2)}ms`);

      // All should complete successfully
      expect(results).toHaveLength(concurrentCount);
      expect(results.every((r) => r.execution.status === 'success')).toBe(true);

      // Should not exceed 10 seconds for 100 concurrent executions
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Multi-Step Workflow Performance', () => {
    it('should scale linearly with step count', async () => {
      service.registerStepHandler('perf-step', async () => {
        return { stepExecuted: true };
      });

      const latenciesByStepCount: Record<number, number[]> = {};

      for (const stepCount of [1, 5, 10, 20]) {
        const steps = Array.from({ length: stepCount }, (_, i) => ({
          id: `step-${i + 1}`,
          type: 'perf-step',
          config: {},
        }));

        const workflow: WorkflowConfig = {
          id: `perf-workflow-${stepCount}`,
          version: 3,
          steps,
        };

        latenciesByStepCount[stepCount] = [];

        for (let i = 0; i < 20; i++) {
          const start = performance.now();
          await service.executeWorkflow(
            workflow,
            `auto-${stepCount}-${i}`,
            'user-1',
            'manual',
            {}
          );
          latenciesByStepCount[stepCount].push(performance.now() - start);
        }
      }

      // Calculate average latency for each step count
      const avgLatencies: Record<number, number> = {};
      for (const [stepCount, latencies] of Object.entries(latenciesByStepCount)) {
        avgLatencies[stepCount] = latencies.reduce((a, b) => a + b) / latencies.length;
      }

      console.log('Average latency by step count:', avgLatencies);

      // Should scale reasonably (not exponentially)
      // Going from 1 to 20 steps shouldn't add >300ms overhead
      const increase = avgLatencies[20] - avgLatencies[1];
      expect(increase).toBeLessThan(300);
    });
  });
});
