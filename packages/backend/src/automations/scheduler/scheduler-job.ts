/**
 * SchedulerJob - Background task runner for scheduled automations
 * Story 3.3: Scheduled Automations & Cron Support
 *
 * Runs every 60 seconds to:
 * 1. Check which schedules are due for execution
 * 2. Trigger executions via ExecutionService
 * 3. Record timing metrics (drift, status)
 * 4. Handle failures gracefully without blocking other schedules
 */

import { CronJob } from 'cron';
import { Logger } from '../../../logger';
import { Database } from '../../../db/database';
import { SchedulerService } from './scheduler.service';
import { ExecutionService } from '../execution/execution.service';
import { AuditLogger } from './audit-logger';

export class SchedulerJob {
  private job: CronJob | null = null;
  private isRunning = false;

  constructor(
    private logger: Logger,
    private db: Database,
    private schedulerService: SchedulerService,
    private executionService: ExecutionService,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Start the scheduler job (runs every 60 seconds)
   */
  start(): void {
    if (this.job) {
      this.logger.info('Scheduler job already running');
      return;
    }

    // Run every 60 seconds
    this.job = new CronJob('*/1 * * * *', () => {
      this.processDueSchedules();
    });

    this.job.start();
    this.logger.info('Scheduler job started (runs every 60 seconds)');
  }

  /**
   * Stop the scheduler job
   */
  stop(): void {
    if (!this.job) {
      this.logger.info('Scheduler job not running');
      return;
    }

    this.job.stop();
    this.job = null;
    this.logger.info('Scheduler job stopped');
  }

  /**
   * Main processing loop: evaluate all enabled schedules and trigger due executions
   * Runs every 60 seconds
   */
  private async processDueSchedules(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('Scheduler already processing, skipping cycle');
      return;
    }

    this.isRunning = true;
    const cycleStartTime = new Date();

    try {
      // Get all enabled schedules
      const schedules = await this.db('automation_schedules')
        .where('enabled', true)
        .select('*');

      this.logger.debug(`Processing ${schedules.length} enabled schedules`);

      let executedCount = 0;
      let errorCount = 0;

      // Process each schedule
      for (const schedule of schedules) {
        try {
          // Check if this schedule is due for execution
          const isDue = await this.schedulerService.evaluateCron(
            schedule.cron_expression,
            schedule.timezone,
            cycleStartTime
          );

          if (!isDue) {
            continue;  // Not due yet
          }

          this.logger.debug(
            `Schedule ${schedule.id} is due for automation ${schedule.automation_id}`
          );

          // Trigger execution via ExecutionService
          const executionStartTime = new Date();

          try {
            const execution = await this.executionService.executeAutomation(
              schedule.automation_id,
              {
                trigger: 'scheduled',
                scheduleId: schedule.id
              }
            );

            const executionEndTime = new Date();

            // Record execution metrics
            await this.schedulerService.recordExecution(
              schedule.id,
              schedule.automation_id,
              cycleStartTime,
              executionEndTime,
              'success'
            );

            executedCount++;

            this.logger.info(
              `✅ Executed scheduled automation ${schedule.automation_id} (execution: ${execution.id})`
            );
          } catch (executionError) {
            const executionErrorTime = new Date();

            // Record failed execution
            await this.schedulerService.recordExecution(
              schedule.id,
              schedule.automation_id,
              cycleStartTime,
              executionErrorTime,
              'failed',
              executionError instanceof Error
                ? executionError.message
                : 'Unknown error'
            );

            errorCount++;

            this.logger.error(
              `❌ Failed to execute scheduled automation ${schedule.automation_id}:`,
              executionError
            );
            // Continue processing other schedules despite error
          }
        } catch (scheduleError) {
          errorCount++;
          this.logger.error(
            `Error processing schedule ${schedule.id}:`,
            scheduleError
          );
          // Continue processing other schedules
        }
      }

      const cycleDuration = new Date().getTime() - cycleStartTime.getTime();

      this.logger.info(
        `Scheduler cycle complete: executed=${executedCount}, errors=${errorCount}, duration=${cycleDuration}ms`
      );
    } catch (error) {
      this.logger.error('Scheduler cycle failed:', error);
      // Continue to next cycle
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger a schedule (for testing or manual retry)
   */
  async manuallyTrigger(scheduleId: string): Promise<void> {
    const schedule = await this.db('automation_schedules')
      .where('id', scheduleId)
      .first();

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const triggerTime = new Date();

    try {
      const execution = await this.executionService.executeAutomation(
        schedule.automation_id,
        {
          trigger: 'scheduled_manual',
          scheduleId
        }
      );

      await this.schedulerService.recordExecution(
        schedule.id,
        schedule.automation_id,
        triggerTime,
        new Date(),
        'success'
      );

      this.logger.info(
        `Manual trigger executed for schedule ${scheduleId} (execution: ${execution.id})`
      );
    } catch (error) {
      await this.schedulerService.recordExecution(
        schedule.id,
        schedule.automation_id,
        triggerTime,
        new Date(),
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  /**
   * Get current job status
   */
  getStatus(): {
    running: boolean;
    isProcessing: boolean;
    nextRunTime?: Date;
  } {
    return {
      running: !!this.job,
      isProcessing: this.isRunning,
      nextRunTime: this.job?.nextDate().toDate()
    };
  }
}
