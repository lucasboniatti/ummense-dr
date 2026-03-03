/**
 * Scheduler API Client Service
 * Story 3.3: Scheduled Automations & Cron Support
 *
 * Provides frontend interface to backend scheduler API endpoints
 */

import { api } from './api';

export interface ScheduleResponse {
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

export interface CronPreviewResponse {
  nextExecutions: Date[];
}

export interface ScheduleCreateInput {
  cronExpression: string;
  timezone?: string;
}

export interface ScheduleUpdateInput {
  cronExpression?: string;
  timezone?: string;
  enabled?: boolean;
}

export class SchedulerService {
  /**
   * Create or update a schedule for an automation
   */
  static async createSchedule(
    automationId: string,
    input: ScheduleCreateInput
  ): Promise<ScheduleResponse> {
    const response = await api.post(
      `/api/automations/${automationId}/schedule`,
      {
        cronExpression: input.cronExpression,
        timezone: input.timezone || 'UTC'
      }
    );
    return response.data;
  }

  /**
   * Get schedule for an automation
   */
  static async getSchedule(automationId: string): Promise<ScheduleResponse> {
    const response = await api.get(`/api/automations/${automationId}/schedule`);
    return response.data;
  }

  /**
   * Get preview of next execution times (default: next 3 executions)
   */
  static async getPreview(
    cronExpression: string,
    timezone: string = 'UTC',
    count: number = 3
  ): Promise<CronPreviewResponse> {
    const response = await api.get(
      `/api/automations/schedule/preview`,
      {
        params: {
          cronExpression,
          timezone,
          count
        }
      }
    );
    return response.data;
  }

  /**
   * Update a schedule
   */
  static async updateSchedule(
    automationId: string,
    input: ScheduleUpdateInput
  ): Promise<ScheduleResponse> {
    const response = await api.patch(
      `/api/automations/${automationId}/schedule`,
      input
    );
    return response.data;
  }

  /**
   * Delete a schedule
   */
  static async deleteSchedule(automationId: string): Promise<void> {
    await api.delete(`/api/automations/${automationId}/schedule`);
  }

  /**
   * Toggle schedule enabled/disabled
   */
  static async toggleSchedule(
    automationId: string,
    enabled: boolean
  ): Promise<ScheduleResponse> {
    const response = await api.post(
      `/api/automations/${automationId}/schedule/toggle`,
      { enabled }
    );
    return response.data;
  }

  /**
   * Validate cron expression
   */
  static async validateCron(
    cronExpression: string,
    timezone: string = 'UTC'
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Attempt to get preview - if it succeeds, cron is valid
      await this.getPreview(cronExpression, timezone, 1);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid cron expression'
      };
    }
  }
}
