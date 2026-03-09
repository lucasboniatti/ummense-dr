import { Response, Router } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError } from '../../utils/errors';
import { SavedFiltersService } from './saved-filters.service';

export function createSavedFiltersRoutes(savedFiltersService: SavedFiltersService) {
  const router = Router();

  router.get('/saved-filters', async (req: AuthRequest, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const presets = await savedFiltersService.listSavedFilters(userId);
      res.json(presets);
    } catch (error) {
      handleRouteError(res, error, 'Failed to list saved filters');
    }
  });

  router.post('/saved-filters', async (req: AuthRequest, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const preset = await savedFiltersService.createSavedFilter(userId, {
        name: req.body?.name,
        description: req.body?.description,
        filter_json: req.body?.filter_json ?? req.body?.filterJson,
      });

      res.status(201).json(preset);
    } catch (error) {
      handleRouteError(res, error, 'Failed to create saved filter');
    }
  });

  router.delete('/saved-filters/:id', async (req: AuthRequest, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      await savedFiltersService.deleteSavedFilter(userId, String(req.params.id || ''));
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, 'Failed to delete saved filter');
    }
  });

  return router;
}

function getUserId(req: AuthRequest): string | null {
  if (!req.user?.id) {
    return null;
  }

  return String(req.user.id);
}

function handleRouteError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  res.status(500).json({ error: message || fallbackMessage });
}
