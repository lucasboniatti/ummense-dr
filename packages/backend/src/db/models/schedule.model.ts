/**
 * Schedule Model - TypeScript interface for automation_schedules table
 * Story 3.3: Scheduled Automations & Cron Support
 */

export interface ScheduleModel {
  id: string;
  automation_id: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_execution_at?: Date;
  next_execution_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateScheduleInput {
  automation_id: string;
  cron_expression: string;
  timezone?: string;
  enabled?: boolean;
}

export interface UpdateScheduleInput {
  cron_expression?: string;
  timezone?: string;
  enabled?: boolean;
  next_execution_at?: Date;
  last_execution_at?: Date;
}
