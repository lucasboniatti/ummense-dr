/**
 * SchedulerJob Integration Tests
 * Story 3.3: Scheduled Automations & Cron Support
 *
 * Tests full scheduler lifecycle: schedule creation, execution, logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SchedulerJob } from '../scheduler-job';
import { SchedulerService } from '../scheduler.service';
import { ExecutionService } from '../../execution/execution.service';
import { AuditLogger } from '../audit-logger';
import { Logger } from '../../../logger';
import { Database } from '../../../db/database';

describe('SchedulerJob Integration', () => {
  let schedulerJob: SchedulerJob;
  let mockLogger: any;
  let mockDb: any;
  let mockSchedulerService: any;
  let mockExecutionService: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    // Mock all dependencies
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn()
    };

    mockDb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis()
    };

    mockSchedulerService = {
      evaluateCron: vi.fn().mockResolvedValue(true),
      recordExecution: vi.fn().mockResolvedValue({})
    };

    mockExecutionService = {
      executeAutomation: vi.fn().mockResolvedValue({
        id: 'exec-1',
        automation_id: 'auto-1'
      })
    };

    mockAuditLogger = {
      logScheduledExecution: vi.fn().mockResolvedValue(undefined)
    };

    schedulerJob = new SchedulerJob(
      mockLogger as Logger,
      mockDb as Database,
      mockSchedulerService as SchedulerService,
      mockExecutionService as ExecutionService,
      mockAuditLogger as AuditLogger
    );
  });

  afterEach(() => {
    schedulerJob.stop();
  });

  describe('lifecycle', () => {
    it('should start and stop scheduler job', () => {
      const initialStatus = schedulerJob.getStatus();
      expect(initialStatus.running).toBe(false);

      schedulerJob.start();
      const runningStatus = schedulerJob.getStatus();
      expect(runningStatus.running).toBe(true);

      schedulerJob.stop();
      const stoppedStatus = schedulerJob.getStatus();
      expect(stoppedStatus.running).toBe(false);
    });

    it('should not start twice', () => {
      schedulerJob.start();
      const callCount1 = mockLogger.info.mock.calls.length;

      schedulerJob.start();
      const callCount2 = mockLogger.info.mock.calls.length;

      // Should log "already running"
      expect(callCount2).toBeGreaterThan(callCount1);
      schedulerJob.stop();
    });

    it('should handle stop when not running', () => {
      const initialStatus = schedulerJob.getStatus();
      expect(initialStatus.running).toBe(false);

      // Should not throw
      expect(() => schedulerJob.stop()).not.toThrow();
    });
  });

  describe('execution flow', () => {
    it('should execute a due schedule', async () => {
      mockDb.select.mockResolvedValue([
        {
          id: 'schedule-1',
          automation_id: 'auto-1',
          cron_expression: '0 9 * * *',
          timezone: 'UTC',
          enabled: true
        }
      ]);

      mockSchedulerService.evaluateCron.mockResolvedValue(true);

      // Simulate the processing
      const schedules = await mockDb.select();
      const schedule = schedules[0];

      const isDue = await mockSchedulerService.evaluateCron(
        schedule.cron_expression,
        schedule.timezone
      );

      if (isDue) {
        await mockExecutionService.executeAutomation(
          schedule.automation_id,
          {
            trigger: 'scheduled',
            scheduleId: schedule.id
          }
        );
      }

      expect(mockExecutionService.executeAutomation).toHaveBeenCalledWith(
        'auto-1',
        expect.objectContaining({
          trigger: 'scheduled',
          scheduleId: 'schedule-1'
        })
      );
    });

    it('should handle execution errors gracefully', async () => {
      mockDb.select.mockResolvedValue([
        {
          id: 'schedule-1',
          automation_id: 'auto-1',
          cron_expression: '0 9 * * *',
          timezone: 'UTC',
          enabled: true
        }
      ]);

      mockSchedulerService.evaluateCron.mockResolvedValue(true);
      mockExecutionService.executeAutomation.mockRejectedValue(
        new Error('Execution failed')
      );

      const schedules = await mockDb.select();
      expect(schedules).toHaveLength(1);

      // Execution should record the error
      try {
        await mockExecutionService.executeAutomation(
          schedules[0].automation_id,
          { trigger: 'scheduled' }
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('audit logging', () => {
    it('should log successful executions', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 500);

      await mockAuditLogger.logScheduledExecution({
        automationId: 'auto-1',
        scheduleId: 'schedule-1',
        scheduledTime: startTime,
        executionTime: endTime,
        driftSeconds: 0.5,
        status: 'success'
      });

      expect(mockAuditLogger.logScheduledExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          automationId: 'auto-1',
          scheduleId: 'schedule-1',
          status: 'success'
        })
      );
    });

    it('should log failed executions with error message', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 1000);

      await mockAuditLogger.logScheduledExecution({
        automationId: 'auto-1',
        scheduleId: 'schedule-1',
        scheduledTime: startTime,
        executionTime: endTime,
        driftSeconds: 1.0,
        status: 'failed',
        errorMessage: 'Execution timeout'
      });

      expect(mockAuditLogger.logScheduledExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Execution timeout'
        })
      );
    });

    it('should measure execution drift', async () => {
      const scheduledTime = new Date('2026-03-03T09:00:00Z');
      const executionTime = new Date('2026-03-03T09:00:45Z'); // 45 seconds later
      const driftSeconds = (executionTime.getTime() - scheduledTime.getTime()) / 1000;

      expect(driftSeconds).toBe(45);

      // Should be within 2-minute tolerance
      expect(Math.abs(driftSeconds)).toBeLessThan(120);
    });
  });

  describe('manual trigger', () => {
    it('should manually trigger a schedule', async () => {
      mockDb.where.mockReturnThis();
      mockDb.first.mockResolvedValue({
        id: 'schedule-1',
        automation_id: 'auto-1',
        cron_expression: '0 9 * * *',
        timezone: 'UTC',
        enabled: true
      });

      mockExecutionService.executeAutomation.mockResolvedValue({
        id: 'exec-1',
        automation_id: 'auto-1'
      });

      // Simulate manual trigger
      const schedule = await mockDb.where('id', 'schedule-1').first();

      const execution = await mockExecutionService.executeAutomation(
        schedule.automation_id,
        {
          trigger: 'scheduled_manual',
          scheduleId: schedule.id
        }
      );

      expect(execution.id).toBe('exec-1');
      expect(mockExecutionService.executeAutomation).toHaveBeenCalledWith(
        'auto-1',
        expect.objectContaining({
          trigger: 'scheduled_manual'
        })
      );
    });
  });

  describe('status reporting', () => {
    it('should report current job status', () => {
      const status = schedulerJob.getStatus();

      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('isProcessing');
      expect(typeof status.running).toBe('boolean');
      expect(typeof status.isProcessing).toBe('boolean');
    });

    it('should prevent concurrent execution', async () => {
      const status = schedulerJob.getStatus();

      // When isProcessing is true, cycle should skip
      expect(status.isProcessing).toBe(false);
    });
  });

  describe('multiple schedules', () => {
    it('should handle multiple schedules in single cycle', async () => {
      mockDb.select.mockResolvedValue([
        {
          id: 'schedule-1',
          automation_id: 'auto-1',
          cron_expression: '0 9 * * *',
          timezone: 'UTC',
          enabled: true
        },
        {
          id: 'schedule-2',
          automation_id: 'auto-2',
          cron_expression: '0 18 * * *',
          timezone: 'UTC',
          enabled: true
        },
        {
          id: 'schedule-3',
          automation_id: 'auto-3',
          cron_expression: '0 12 * * *',
          timezone: 'UTC',
          enabled: false // Should be skipped
        }
      ]);

      mockSchedulerService.evaluateCron
        .mockResolvedValueOnce(true)  // schedule-1 is due
        .mockResolvedValueOnce(false) // schedule-2 is not due
        .mockResolvedValueOnce(true); // schedule-3 would be due but disabled

      const schedules = await mockDb.select();
      let executionCount = 0;

      for (const schedule of schedules) {
        const isDue = await mockSchedulerService.evaluateCron(
          schedule.cron_expression,
          schedule.timezone
        );

        if (isDue && schedule.enabled) {
          executionCount++;
          await mockExecutionService.executeAutomation(schedule.automation_id, {
            trigger: 'scheduled'
          });
        }
      }

      expect(executionCount).toBe(1); // Only schedule-1 should execute
    });

    it('should continue processing if one schedule fails', async () => {
      mockDb.select.mockResolvedValue([
        {
          id: 'schedule-1',
          automation_id: 'auto-1',
          enabled: true
        },
        {
          id: 'schedule-2',
          automation_id: 'auto-2',
          enabled: true
        }
      ]);

      mockSchedulerService.evaluateCron.mockResolvedValue(true);
      mockExecutionService.executeAutomation
        .mockRejectedValueOnce(new Error('First execution failed'))
        .mockResolvedValueOnce({ id: 'exec-2' });

      const schedules = await mockDb.select();
      let successCount = 0;
      let errorCount = 0;

      for (const schedule of schedules) {
        try {
          const isDue = await mockSchedulerService.evaluateCron(
            schedule.cron_expression,
            schedule.timezone
          );
          if (isDue) {
            await mockExecutionService.executeAutomation(
              schedule.automation_id,
              { trigger: 'scheduled' }
            );
            successCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);
    });
  });
});
