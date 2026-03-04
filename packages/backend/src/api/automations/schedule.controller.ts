/**
 * Schedule Controller - HTTP request handling for schedule operations
 * Story 3.3: Scheduled Automations & Cron Support
 */

import { Request, Response } from 'express';
import { SchedulerService } from '../../automations/scheduler/scheduler.service';
import { asNumber, asOptionalString, asString } from '../../utils/http';

export class ScheduleController {
  constructor(private schedulerService: SchedulerService) {}

  /**
   * POST /api/automations/:id/schedule - Create or update schedule
   */
  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const automationId = asString((req.params as any).automationId || (req.params as any).id);
      const { cronExpression, timezone = 'UTC' } = req.body;

      if (!cronExpression) {
        res.status(400).json({
          error: 'Missing required field: cronExpression'
        });
        return;
      }

      // Check if schedule already exists
      const existing = await this.schedulerService.getScheduleByAutomationId(
        automationId
      );

      let schedule;
      if (existing) {
        schedule = await this.schedulerService.updateSchedule(existing.id, {
          cronExpression,
          timezone
        });
      } else {
        schedule = await this.schedulerService.createSchedule(
          automationId,
          cronExpression,
          timezone
        );
      }

      res.json(schedule);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create schedule'
      });
    }
  }

  /**
   * GET /api/automations/:id/schedule - Get schedule
   */
  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const automationId = asString((req.params as any).automationId || (req.params as any).id);

      const schedule = await this.schedulerService.getScheduleByAutomationId(
        automationId
      );

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json(schedule);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get schedule'
      });
    }
  }

  /**
   * GET /api/automations/:id/schedule/preview - Get next execution times
   */
  async getPreview(req: Request, res: Response): Promise<void> {
    try {
      const cronExpression = asOptionalString((req.query as any).cronExpression);
      const timezone = asString((req.query as any).timezone || 'UTC');
      const count = asNumber((req.query as any).count, 3);

      if (!cronExpression) {
        res.status(400).json({
          error: 'Missing required parameter: cronExpression'
        });
        return;
      }

      const nextExecutions = await this.schedulerService.getNextExecutions(
        cronExpression,
        timezone,
        count || 3
      );

      res.json({ nextExecutions });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to get preview'
      });
    }
  }

  /**
   * PATCH /api/automations/:id/schedule - Update schedule
   */
  async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const automationId = asString((req.params as any).automationId || (req.params as any).id);

      const schedule = await this.schedulerService.getScheduleByAutomationId(
        automationId
      );

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      const updated = await this.schedulerService.updateSchedule(
        schedule.id,
        req.body
      );

      res.json(updated);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update schedule'
      });
    }
  }

  /**
   * DELETE /api/automations/:id/schedule - Delete schedule
   */
  async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const automationId = asString((req.params as any).automationId || (req.params as any).id);

      const schedule = await this.schedulerService.getScheduleByAutomationId(
        automationId
      );

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      await this.schedulerService.deleteSchedule(schedule.id);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete schedule'
      });
    }
  }

  /**
   * POST /api/automations/:id/schedule/toggle - Toggle enabled/disabled
   */
  async toggleSchedule(req: Request, res: Response): Promise<void> {
    try {
      const automationId = asString((req.params as any).automationId || (req.params as any).id);
      const { enabled } = req.body;

      const schedule = await this.schedulerService.getScheduleByAutomationId(
        automationId
      );

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      const updated = await this.schedulerService.toggleSchedule(
        schedule.id,
        enabled
      );

      res.json(updated);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to toggle schedule'
      });
    }
  }
}
