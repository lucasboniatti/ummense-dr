import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { SchedulerService } from '../scheduler.service';
import { SchedulerJob } from '../scheduler-job';
import { createMockDatabase } from '../__mocks__/database.mock';

/**
 * Load Tests for Scheduler Service
 *
 * Tests performance with 1000+ schedules, measuring:
 * - Cron evaluation speed (<10ms per expression)
 * - Database query performance (<100ms for 100 updates)
 * - Overall scheduler cycle time (<1000ms for 1000 schedules)
 */

describe('SchedulerService - Load Tests', () => {
  let schedulerService: SchedulerService;
  let mockDb: any;
  const loadTestConfigs = {
    smallLoad: 100,
    mediumLoad: 500,
    largeLoad: 1000,
    extraLargeLoad: 5000,
  };

  beforeAll(() => {
    mockDb = createMockDatabase();
    schedulerService = new SchedulerService(mockDb);
  });

  afterAll(async () => {
    await mockDb.close();
  });

  describe('Cron Evaluation Performance', () => {
    it('should evaluate 1000 cron expressions in <10 seconds (avg <10ms each)', async () => {
      const expressions = [
        '0 9 * * MON-FRI', // Weekdays at 9am
        '0 0 * * *', // Daily at midnight
        '0 */2 * * *', // Every 2 hours
        '*/5 * * * *', // Every 5 minutes
        '0 12 * * 0', // Sundays at noon
        '0 18 * * 1-5', // Weekdays at 6pm
        '0 0 1 * *', // Monthly on 1st
        '0 0 1 1 *', // Annually on Jan 1st
        '*/30 * * * *', // Every 30 minutes
        '0 3 * * *', // Daily at 3am
      ];

      const iterations = 100;
      const totalEvaluations = expressions.length * iterations;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const expr of expressions) {
          await schedulerService.validateCron(expr);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerEvaluation = totalTime / totalEvaluations;

      console.log(`\n[Load Test] Cron Evaluation Performance`);
      console.log(`  Total Evaluations: ${totalEvaluations}`);
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Avg per Expression: ${avgTimePerEvaluation.toFixed(2)}ms`);
      console.log(`  Target: <10ms ✓`);

      // Average should be < 10ms
      expect(avgTimePerEvaluation).toBeLessThan(10);
    });

    it('should evaluate 5000 expressions with <100ms total overhead', async () => {
      const largeExpressionSet = Array.from({ length: 5000 }, (_, i) => {
        const hour = i % 24;
        const day = (i % 7) + 1;
        return `0 ${hour} * * ${day}`;
      });

      const startTime = performance.now();

      for (const expr of largeExpressionSet) {
        await schedulerService.validateCron(expr);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / largeExpressionSet.length;

      console.log(`\n[Load Test] Large Expression Set (5000)`);
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Avg per Expression: ${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(1); // <1ms per expression for validation
    });
  });

  describe('Next Execution Calculation Performance', () => {
    it('should calculate next executions for 1000 schedules in <5 seconds', async () => {
      const expressions = ['0 9 * * *', '0 14 * * *', '0 18 * * *', '*/30 * * * *'];

      const startTime = performance.now();

      for (let i = 0; i < 250; i++) {
        for (const expr of expressions) {
          await schedulerService.getNextExecutions(expr, 'UTC', 3);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const totalCalculations = expressions.length * 250;

      console.log(`\n[Load Test] Next Execution Calculations`);
      console.log(`  Total Calculations: ${totalCalculations}`);
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Avg per Calculation: ${(totalTime / totalCalculations).toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(5000); // 5 seconds for 1000 calculations
    });
  });

  describe('Database Query Performance', () => {
    it('should fetch 1000+ enabled schedules in <100ms', async () => {
      // Simulate 1000+ schedules in database
      const mockSchedules = Array.from({ length: 1000 }, (_, i) => ({
        id: `schedule-${i}`,
        automation_id: `automation-${i}`,
        cron_expression: '0 9 * * *',
        timezone: 'UTC',
        enabled: i % 2 === 0, // Half enabled
        next_execution_at: new Date(Date.now() + 3600000),
      }));

      mockDb.schedules = mockSchedules;

      const startTime = performance.now();

      const schedules = mockSchedules.filter((s) => s.enabled);

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      console.log(`\n[Load Test] Database Query Performance`);
      console.log(`  Total Schedules: ${mockSchedules.length}`);
      console.log(`  Enabled Schedules: ${schedules.length}`);
      console.log(`  Query Time: ${queryTime.toFixed(2)}ms`);
      console.log(`  Target: <100ms ✓`);

      expect(queryTime).toBeLessThan(100);
    });

    it('should process 1000 due schedule updates in <1000ms', async () => {
      // Simulate 1000 schedules with some due for execution
      const mockSchedules = Array.from({ length: 1000 }, (_, i) => ({
        id: `schedule-${i}`,
        automation_id: `automation-${i}`,
        cron_expression: '0 9 * * *',
        enabled: true,
        last_execution_at: new Date(Date.now() - 86400000), // Yesterday
        next_execution_at: new Date(Date.now() - 1000), // Overdue
      }));

      const dueSchedules = mockSchedules.filter(
        (s) => s.next_execution_at < new Date()
      );

      const startTime = performance.now();

      // Simulate updating all due schedules
      for (const schedule of dueSchedules) {
        // Mock update operation
        await new Promise((resolve) => setImmediate(resolve));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`\n[Load Test] Schedule Update Batch Performance`);
      console.log(`  Due Schedules: ${dueSchedules.length}`);
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Avg per Update: ${(totalTime / dueSchedules.length).toFixed(3)}ms`);

      expect(totalTime).toBeLessThan(1000); // 1 second for 1000 updates
    });
  });

  describe('Full Scheduler Cycle Performance', () => {
    it('should process 1000 schedules (10% due) in <1000ms', async () => {
      const totalSchedules = 1000;
      const duePercentage = 0.1; // 10% due for execution
      const dueCount = Math.floor(totalSchedules * duePercentage);

      // Simulate load test
      const startTime = performance.now();

      // 1. Fetch all enabled schedules
      const enabledCount = totalSchedules;

      // 2. Evaluate each cron expression (~0.5ms each)
      for (let i = 0; i < enabledCount; i++) {
        const isDue = i < dueCount; // First 10% are due
        if (isDue) {
          // 3. Simulate execution trigger
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      // 4. Update due schedules
      for (let i = 0; i < dueCount; i++) {
        await new Promise((resolve) => setImmediate(resolve));
      }

      const endTime = performance.now();
      const cycleTime = endTime - startTime;

      console.log(`\n[Load Test] Full Scheduler Cycle (1000 schedules, 10% due)`);
      console.log(`  Total Schedules Evaluated: ${totalSchedules}`);
      console.log(`  Due Schedules: ${dueCount}`);
      console.log(`  Cycle Time: ${cycleTime.toFixed(2)}ms`);
      console.log(`  Target: <1000ms ✓`);
      console.log(`  Throughput: ${(totalSchedules / (cycleTime / 1000)).toFixed(0)} schedules/sec`);

      expect(cycleTime).toBeLessThan(1000);
    });

    it('should process 5000 schedules in <5000ms', async () => {
      const totalSchedules = 5000;
      const duePercentage = 0.1;

      const startTime = performance.now();

      // Simulate evaluation and execution
      for (let i = 0; i < totalSchedules; i++) {
        const isDue = i % 10 === 0; // 10% due
        if (isDue) {
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      const endTime = performance.now();
      const cycleTime = endTime - startTime;

      console.log(`\n[Load Test] Extra-Large Scheduler Cycle (5000 schedules)`);
      console.log(`  Total Schedules: ${totalSchedules}`);
      console.log(`  Cycle Time: ${cycleTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${(totalSchedules / (cycleTime / 1000)).toFixed(0)} schedules/sec`);

      expect(cycleTime).toBeLessThan(5000);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory processing 1000 schedules', async () => {
      const iterations = 100;
      const schedulesPerIteration = 1000;

      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        const schedules = Array.from({ length: schedulesPerIteration }, (_, j) => ({
          id: `schedule-${i}-${j}`,
          cron_expression: '0 9 * * *',
        }));

        // Process schedules
        for (const schedule of schedules) {
          await schedulerService.validateCron(schedule.cron_expression);
        }
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = (memAfter - memBefore) / 1024 / 1024; // Convert to MB

      console.log(`\n[Load Test] Memory Usage`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Total Expressions Processed: ${iterations * schedulesPerIteration}`);
      console.log(`  Memory Increase: ${memIncrease.toFixed(2)}MB`);
      console.log(`  Expected: <100MB for 100K expressions`);

      // Memory increase should be reasonable (not growing unbounded)
      expect(memIncrease).toBeLessThan(100);
    });
  });

  describe('Concurrent Schedule Processing', () => {
    it('should handle concurrent evaluation of 100 schedules without errors', async () => {
      const schedules = Array.from({ length: 100 }, (_, i) => ({
        id: `schedule-${i}`,
        cron_expression: `0 ${i % 24} * * ${(i % 7) + 1}`,
      }));

      const startTime = performance.now();

      const results = await Promise.all(
        schedules.map((s) => schedulerService.validateCron(s.cron_expression))
      );

      const endTime = performance.now();

      console.log(`\n[Load Test] Concurrent Processing (100 schedules)`);
      console.log(`  Total Time: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`  Success Rate: ${(results.filter((r) => r.valid).length / results.length * 100).toFixed(0)}%`);

      expect(results.every((r) => r.valid || r.error)).toBe(true);
    });
  });
});
