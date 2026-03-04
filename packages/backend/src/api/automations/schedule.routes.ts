/**
 * Schedule API Routes
 * Story 3.3: Scheduled Automations & Cron Support
 */

import { Router } from 'express';
import { ScheduleController } from './schedule.controller';
import { authenticateUser } from '../../middleware/auth';

export function createScheduleRoutes(controller: ScheduleController): Router {
  const router = Router({ mergeParams: true });

  // Middleware: authenticate user
  router.use(authenticateUser);

  // POST /api/automations/:id/schedule - Create or update schedule
  router.post('/', (req, res) => controller.createSchedule(req, res));

  // GET /api/automations/:id/schedule - Get schedule
  router.get('/', (req, res) => controller.getSchedule(req, res));

  // GET /api/automations/:id/schedule/preview - Get next execution preview
  router.get('/preview', (req, res) => controller.getPreview(req, res));

  // PATCH /api/automations/:id/schedule - Update schedule
  router.patch('/', (req, res) => controller.updateSchedule(req, res));

  // DELETE /api/automations/:id/schedule - Delete schedule
  router.delete('/', (req, res) => controller.deleteSchedule(req, res));

  // POST /api/automations/:id/schedule/toggle - Toggle enabled/disabled
  router.post('/toggle', (req, res) => controller.toggleSchedule(req, res));

  return router;
}
