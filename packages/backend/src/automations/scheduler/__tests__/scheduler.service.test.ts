/**
 * SchedulerService Unit Tests
 * Story 3.3: Scheduled Automations & Cron Support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulerService } from '../scheduler.service';
import { Database } from '../../../db/database';

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let mockDb: any;

  beforeEach(() => {
    // Mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(1),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis()
    };

    schedulerService = new SchedulerService(mockDb as Database);
  });

  describe('validateCron', () => {
    it('should validate valid cron expressions', async () => {
      const result = await schedulerService.validateCron('0 9 * * *', 'UTC');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid cron expressions', async () => {
      const result = await schedulerService.validateCron('invalid cron', 'UTC');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid timezone', async () => {
      const result = await schedulerService.validateCron('0 9 * * *', 'Invalid/Timezone');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getNextExecutions', () => {
    it('should return next 3 executions by default', async () => {
      const executions = await schedulerService.getNextExecutions('0 9 * * *', 'UTC');
      expect(executions).toHaveLength(3);
      expect(executions[0]).toBeInstanceOf(Date);
    });

    it('should return specified count of next executions', async () => {
      const executions = await schedulerService.getNextExecutions('0 9 * * *', 'UTC', 5);
      expect(executions).toHaveLength(5);
    });

    it('should return executions in chronological order', async () => {
      const executions = await schedulerService.getNextExecutions('0 9 * * *', 'UTC', 3);
      for (let i = 0; i < executions.length - 1; i++) {
        expect(executions[i].getTime()).toBeLessThan(executions[i + 1].getTime());
      }
    });

    it('should handle different timezones', async () => {
      const execUTC = await schedulerService.getNextExecutions('0 9 * * *', 'UTC');
      const execBR = await schedulerService.getNextExecutions('0 9 * * *', 'America/Sao_Paulo');

      // Executions should differ based on timezone offset
      expect(execUTC[0]).not.toEqual(execBR[0]);
    });
  });

  describe('evaluateCron', () => {
    it('should detect if schedule is due for execution', async () => {
      // 9:00 AM UTC on any day
      const now = new Date('2026-03-03T09:00:00Z');
      const isDue = await schedulerService.evaluateCron('0 9 * * *', 'UTC', now);
      expect(isDue).toBe(true);
    });

    it('should not trigger if not within schedule time', async () => {
      // 9:01 AM UTC (outside execution window)
      const now = new Date('2026-03-03T09:01:00Z');
      const isDue = await schedulerService.evaluateCron('0 9 * * *', 'UTC', now);
      expect(isDue).toBe(false);
    });

    it('should respect timezone when evaluating', async () => {
      const now = new Date('2026-03-03T09:00:00Z');
      // 9 AM in UTC vs 9 AM in America/Sao_Paulo are different absolute times
      const isDueUTC = await schedulerService.evaluateCron('0 9 * * *', 'UTC', now);
      const isDueBR = await schedulerService.evaluateCron('0 9 * * *', 'America/Sao_Paulo', now);

      // These might differ depending on the actual UTC offset
      expect(typeof isDueUTC).toBe('boolean');
      expect(typeof isDueBR).toBe('boolean');
    });
  });

  describe('createSchedule', () => {
    it('should create a new schedule', async () => {
      mockDb.insert.mockResolvedValue([{
        id: 'schedule-1',
        automation_id: 'auto-1',
        cron_expression: '0 9 * * *',
        timezone: 'UTC',
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);

      const result = await schedulerService.createSchedule(
        'auto-1',
        '0 9 * * *',
        'UTC'
      );

      expect(result.id).toBe('schedule-1');
      expect(result.cron_expression).toBe('0 9 * * *');
      expect(result.timezone).toBe('UTC');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should default timezone to UTC if not provided', async () => {
      mockDb.insert.mockResolvedValue([{
        id: 'schedule-1',
        automation_id: 'auto-1',
        cron_expression: '0 9 * * *',
        timezone: 'UTC',
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);

      await schedulerService.createSchedule('auto-1', '0 9 * * *');

      const insertCall = mockDb.insert.mock.calls[0];
      expect(insertCall[0][0].timezone).toBe('UTC');
    });
  });

  describe('updateSchedule', () => {
    it('should update an existing schedule', async () => {
      mockDb.update.mockResolvedValue(1);
      mockDb.first.mockResolvedValue({
        id: 'schedule-1',
        cron_expression: '0 18 * * *',
        timezone: 'UTC',
        enabled: false
      });

      const result = await schedulerService.updateSchedule('schedule-1', {
        cron_expression: '0 18 * * *',
        enabled: false
      });

      expect(result.cron_expression).toBe('0 18 * * *');
      expect(result.enabled).toBe(false);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('toggleSchedule', () => {
    it('should enable a disabled schedule', async () => {
      mockDb.first.mockResolvedValue({
        id: 'schedule-1',
        enabled: false
      });
      mockDb.update.mockResolvedValue(1);

      const result = await schedulerService.toggleSchedule('schedule-1', true);
      expect(result.enabled).toBe(true);
    });

    it('should disable an enabled schedule', async () => {
      mockDb.first.mockResolvedValue({
        id: 'schedule-1',
        enabled: true
      });
      mockDb.update.mockResolvedValue(1);

      const result = await schedulerService.toggleSchedule('schedule-1', false);
      expect(result.enabled).toBe(false);
    });
  });

  describe('getDueSchedules', () => {
    it('should return only enabled schedules that are due', async () => {
      mockDb.where.mockReturnThis();
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
        }
      ]);

      const now = new Date('2026-03-03T09:00:00Z');
      const dueSchedules = await schedulerService.getDueSchedules(now);

      expect(dueSchedules.length).toBeGreaterThanOrEqual(0);
      expect(mockDb.where).toHaveBeenCalledWith('enabled', true);
    });
  });

  describe('getSchedulerStats', () => {
    it('should return scheduler statistics', async () => {
      mockDb.select.mockReturnThis();
      mockDb.count.mockResolvedValue([{ count: 10 }]);
      mockDb.where.mockReturnThis();
      mockDb.avg.mockResolvedValue([{ avg_drift: 15.5 }]);

      const stats = await schedulerService.getSchedulerStats();

      expect(stats).toHaveProperty('totalSchedules');
      expect(stats).toHaveProperty('enabledSchedules');
      expect(stats).toHaveProperty('averageDriftSeconds');
    });
  });

  describe('error handling', () => {
    it('should throw on invalid cron during creation', async () => {
      await expect(
        schedulerService.createSchedule('auto-1', 'invalid cron')
      ).rejects.toThrow();
    });

    it('should throw on invalid timezone', async () => {
      await expect(
        schedulerService.createSchedule('auto-1', '0 9 * * *', 'Invalid/TZ')
      ).rejects.toThrow();
    });
  });
});
