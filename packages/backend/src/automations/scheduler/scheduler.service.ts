/**
 * SchedulerService - Cron-based automation scheduler
 * Story 3.3: Scheduled Automations & Cron Support
 *
 * Responsibilities:
 * - Evaluate cron expressions to determine if execution is due
 * - Calculate next execution times for preview display
 * - Validate cron syntax with error reporting
 * - Handle timezone-aware scheduling
 */

import { CronExpression } from 'cron-parser';
import { Database } from '../../../db/database';
import { ExecutionService } from '../execution/execution.service';
import { AuditLogger } from './audit-logger';

export interface ScheduledAutomation {
  id: string;
  automationId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  lastExecutionAt?: Date;
  nextExecutionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CronValidationResult {
  valid: boolean;
  error?: string;
  nextExecutions?: Date[];
}

export interface SchedulerExecutionRecord {
  automationId: string;
  scheduledTime: Date;
  executionTime: Date;
  driftSeconds: number;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
}

export class SchedulerService {
  constructor(
    private db: Database,
    private executionService: ExecutionService,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Validate cron expression syntax
   * Returns validation result with next 3 execution times if valid
   */
  async validateCron(
    cronExpr: string,
    timezone: string = 'UTC'
  ): Promise<CronValidationResult> {
    try {
      // Test cron expression parsing
      const interval = new CronExpression(cronExpr, { tz: timezone });

      // Get next 3 executions for preview
      const nextExecutions = Array.from({ length: 3 }, () =>
        interval.next().toDate()
      );

      return {
        valid: true,
        nextExecutions
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid cron expression'
      };
    }
  }

  /**
   * Get next N execution times based on cron expression
   * Used for UI preview of upcoming executions
   */
  async getNextExecutions(
    cronExpr: string,
    timezone: string = 'UTC',
    count: number = 3
  ): Promise<Date[]> {
    try {
      const interval = new CronExpression(cronExpr, { tz: timezone });
      return Array.from({ length: count }, () => interval.next().toDate());
    } catch (error) {
      throw new Error(
        `Failed to calculate next executions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Evaluate if a cron expression is due at the current time
   * Allows ±60 seconds drift window for scheduler latency
   */
  async evaluateCron(
    cronExpr: string,
    timezone: string = 'UTC',
    currentTime: Date = new Date()
  ): Promise<boolean> {
    try {
      const interval = new CronExpression(cronExpr, { tz: timezone });
      const nextExecution = interval.next().toDate();

      // Check if we're within 60 seconds of scheduled time
      const diff = Math.abs(currentTime.getTime() - nextExecution.getTime());
      return diff <= 60000;  // Within 1 minute window (±30s tolerance)
    } catch (error) {
      throw new Error(
        `Failed to evaluate cron expression: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new schedule for an automation
   */
  async createSchedule(
    automationId: string,
    cronExpression: string,
    timezone: string = 'UTC'
  ): Promise<ScheduledAutomation> {
    // Validate cron expression first
    const validation = await this.validateCron(cronExpression, timezone);
    if (!validation.valid) {
      throw new Error(`Invalid cron expression: ${validation.error}`);
    }

    // Calculate next execution time
    const nextExecutions = await this.getNextExecutions(
      cronExpression,
      timezone,
      1
    );

    const schedule: ScheduledAutomation = {
      id: crypto.randomUUID(),
      automationId,
      cronExpression,
      timezone,
      enabled: true,
      nextExecutionAt: nextExecutions[0],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert into database
    await this.db('automation_schedules').insert(schedule);

    return schedule;
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduledAutomation>
  ): Promise<ScheduledAutomation> {
    // Validate cron if being updated
    if (updates.cronExpression) {
      const validation = await this.validateCron(
        updates.cronExpression,
        updates.timezone || 'UTC'
      );
      if (!validation.valid) {
        throw new Error(`Invalid cron expression: ${validation.error}`);
      }

      // Recalculate next execution
      const nextExecutions = await this.getNextExecutions(
        updates.cronExpression,
        updates.timezone || 'UTC',
        1
      );
      updates.nextExecutionAt = nextExecutions[0];
    }

    updates.updatedAt = new Date();

    await this.db('automation_schedules')
      .where('id', scheduleId)
      .update(updates);

    const updated = await this.db('automation_schedules')
      .where('id', scheduleId)
      .first();

    return updated;
  }

  /**
   * Get schedule by automation ID
   */
  async getScheduleByAutomationId(
    automationId: string
  ): Promise<ScheduledAutomation | null> {
    return this.db('automation_schedules')
      .where('automation_id', automationId)
      .first() || null;
  }

  /**
   * Toggle schedule enabled/disabled without deletion
   */
  async toggleSchedule(
    scheduleId: string,
    enabled: boolean
  ): Promise<ScheduledAutomation> {
    return this.updateSchedule(scheduleId, { enabled });
  }

  /**
   * Get all enabled schedules that are due for execution
   * Returns schedules where next_execution_at <= now
   */
  async getDueSchedules(now: Date = new Date()): Promise<ScheduledAutomation[]> {
    return this.db('automation_schedules')
      .where('enabled', true)
      .where('next_execution_at', '<=', now)
      .select('*');
  }

  /**
   * Record execution of a scheduled automation
   * Updates next_execution_at and logs drift metrics
   */
  async recordExecution(
    scheduleId: string,
    automationId: string,
    scheduledTime: Date,
    executionTime: Date,
    status: 'success' | 'failed' = 'success',
    errorMessage?: string
  ): Promise<SchedulerExecutionRecord> {
    const driftSeconds = Math.abs(
      (executionTime.getTime() - scheduledTime.getTime()) / 1000
    );

    // Get schedule to extract cron expression
    const schedule = await this.db('automation_schedules')
      .where('id', scheduleId)
      .first();

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Calculate next execution time
    const nextExecutions = await this.getNextExecutions(
      schedule.cron_expression,
      schedule.timezone,
      1
    );

    // Update schedule with execution metrics
    await this.db('automation_schedules')
      .where('id', scheduleId)
      .update({
        last_execution_at: executionTime,
        next_execution_at: nextExecutions[0],
        updated_at: new Date()
      });

    // Log execution record
    const record: SchedulerExecutionRecord = {
      automationId,
      scheduledTime,
      executionTime,
      driftSeconds,
      status,
      errorMessage
    };

    // Audit log the execution
    await this.auditLogger.logScheduledExecution({
      automationId,
      scheduleId,
      scheduledTime,
      executionTime,
      driftSeconds,
      status,
      errorMessage
    });

    return record;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.db('automation_schedules')
      .where('id', scheduleId)
      .delete();
  }

  /**
   * Get statistics on scheduler performance
   */
  async getSchedulerStats(): Promise<{
    totalSchedules: number;
    enabledSchedules: number;
    dueCount: number;
    averageDriftSeconds: number;
    failureRate: number;
  }> {
    const total = await this.db('automation_schedules').count('* as count').first();
    const enabled = await this.db('automation_schedules')
      .where('enabled', true)
      .count('* as count')
      .first();
    const due = await this.db('automation_schedules')
      .where('enabled', true)
      .where('next_execution_at', '<=', new Date())
      .count('* as count')
      .first();

    return {
      totalSchedules: total?.count || 0,
      enabledSchedules: enabled?.count || 0,
      dueCount: due?.count || 0,
      averageDriftSeconds: 0, // Will be calculated from audit logs
      failureRate: 0 // Will be calculated from audit logs
    };
  }
}
