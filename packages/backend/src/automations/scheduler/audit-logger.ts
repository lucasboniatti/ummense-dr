/**
 * AuditLogger - Immutable append-only logging for scheduled executions
 * Story 3.3: Scheduled Automations & Cron Support
 *
 * Records all scheduled execution attempts with timing metrics for debugging
 */

import type { Database } from '../../db/database';

export interface ScheduledExecutionLogEntry {
  automationId: string;
  scheduleId: string;
  scheduledTime: Date;
  executionTime: Date;
  driftSeconds: number;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  timestamp?: Date;
}

export class AuditLogger {
  constructor(private db: Database) {}

  /**
   * Log a scheduled execution attempt (immutable append-only)
   */
  async logScheduledExecution(entry: ScheduledExecutionLogEntry): Promise<void> {
    try {
      // Log to dedicated scheduler_audit_logs table
      // Note: This table should be created separately with RLS policies
      // preventing updates and deletes
      await this.db('scheduler_audit_logs').insert({
        id: this.generateId(),
        automation_id: entry.automationId,
        schedule_id: entry.scheduleId,
        scheduled_time: entry.scheduledTime,
        execution_time: entry.executionTime,
        drift_seconds: entry.driftSeconds,
        status: entry.status,
        error_message: entry.errorMessage,
        created_at: entry.timestamp || new Date()
      });
    } catch (error) {
      // Log error but don't throw - don't block execution on logging failure
      console.error(
        'Failed to log scheduled execution:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Query execution history for a schedule
   */
  async getExecutionHistory(
    scheduleId: string,
    limit: number = 10
  ): Promise<ScheduledExecutionLogEntry[]> {
    const entries = await this.db('scheduler_audit_logs')
      .where('schedule_id', scheduleId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('*');

    return entries.map((row: any) => ({
      automationId: row.automation_id,
      scheduleId: row.schedule_id,
      scheduledTime: row.scheduled_time,
      executionTime: row.execution_time,
      driftSeconds: row.drift_seconds,
      status: row.status,
      errorMessage: row.error_message,
      timestamp: row.created_at
    }));
  }

  /**
   * Get executions with excessive drift (>30 seconds)
   */
  async getHighDriftExecutions(
    minimumDrift: number = 30,
    limit: number = 20
  ): Promise<ScheduledExecutionLogEntry[]> {
    const entries = await this.db('scheduler_audit_logs')
      .where('drift_seconds', '>', minimumDrift)
      .orderBy('drift_seconds', 'desc')
      .limit(limit)
      .select('*');

    return entries.map((row: any) => ({
      automationId: row.automation_id,
      scheduleId: row.schedule_id,
      scheduledTime: row.scheduled_time,
      executionTime: row.execution_time,
      driftSeconds: row.drift_seconds,
      status: row.status,
      errorMessage: row.error_message,
      timestamp: row.created_at
    }));
  }

  /**
   * Get failed executions for debugging
   */
  async getFailedExecutions(limit: number = 20): Promise<ScheduledExecutionLogEntry[]> {
    const entries = await this.db('scheduler_audit_logs')
      .where('status', 'failed')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('*');

    return entries.map((row: any) => ({
      automationId: row.automation_id,
      scheduleId: row.schedule_id,
      scheduledTime: row.scheduled_time,
      executionTime: row.execution_time,
      driftSeconds: row.drift_seconds,
      status: row.status,
      errorMessage: row.error_message,
      timestamp: row.created_at
    }));
  }

  /**
   * Calculate average drift for a schedule
   */
  async getAverageDrift(scheduleId: string): Promise<number> {
    const result = await this.db('scheduler_audit_logs')
      .where('schedule_id', scheduleId)
      .avg('drift_seconds as avg_drift')
      .first();

    return result?.avg_drift || 0;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
