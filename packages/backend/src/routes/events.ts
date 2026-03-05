import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber, asOptionalString } from '../utils/http';
import { AppError } from '../utils/errors';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/request-user';

const router = Router();

async function ensureEventOwnership(eventId: string, userId: string) {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  return event;
}

// GET /api/events
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const limit = Math.min(asNumber(req.query.limit, 50), 200);
    const offset = Math.max(asNumber(req.query.offset, 0), 0);
    const startDate = asOptionalString(req.query.startDate);
    const endDate = asOptionalString(req.query.endDate);
    const cardId = asNumber(req.query.cardId, 0);
    const taskId = asNumber(req.query.taskId, 0);

    let query = supabase
      .from('events')
      .select('id,user_id,title,description,starts_at,ends_at,card_id,task_id,metadata,created_at,updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (startDate) {
      query = query.gte('starts_at', startDate);
    }

    if (endDate) {
      query = query.lte('starts_at', endDate);
    }

    if (cardId) {
      query = query.eq('card_id', cardId);
    }

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    const { data: events, error } = await query
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      items: events || [],
      pagination: { limit, offset },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/events
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const title = asOptionalString(req.body?.title);
    const startsAt = asOptionalString(req.body?.startsAt);

    if (!title || !startsAt) {
      throw new AppError('title and startsAt are required', 400);
    }

    const payload = {
      user_id: userId,
      title,
      description: asOptionalString(req.body?.description) || null,
      starts_at: startsAt,
      ends_at: asOptionalString(req.body?.endsAt) || null,
      card_id: asNumber(req.body?.cardId, 0) || null,
      task_id: asNumber(req.body?.taskId, 0) || null,
      metadata: req.body?.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: event, error } = await supabase
      .from('events')
      .insert(payload)
      .select('id,user_id,title,description,starts_at,ends_at,card_id,task_id,metadata,created_at,updated_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/events/:eventId
router.patch('/:eventId', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const eventId = asOptionalString(req.params.eventId);

    if (!eventId) {
      throw new AppError('Invalid event id', 400);
    }

    await ensureEventOwnership(eventId, userId);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (req.body?.title !== undefined) {
      const title = asOptionalString(req.body.title);
      if (!title) {
        throw new AppError('title cannot be empty', 422);
      }
      updateData.title = title;
    }

    if (req.body?.description !== undefined) {
      updateData.description = asOptionalString(req.body.description) || null;
    }

    if (req.body?.startsAt !== undefined) {
      const startsAt = asOptionalString(req.body.startsAt);
      if (!startsAt) {
        throw new AppError('startsAt cannot be empty', 422);
      }
      updateData.starts_at = startsAt;
    }

    if (req.body?.endsAt !== undefined) {
      updateData.ends_at = asOptionalString(req.body.endsAt) || null;
    }

    if (req.body?.cardId !== undefined) {
      updateData.card_id = asNumber(req.body.cardId, 0) || null;
    }

    if (req.body?.taskId !== undefined) {
      updateData.task_id = asNumber(req.body.taskId, 0) || null;
    }

    if (req.body?.metadata !== undefined) {
      updateData.metadata = req.body.metadata || {};
    }

    const { data: event, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id,user_id,title,description,starts_at,ends_at,card_id,task_id,metadata,created_at,updated_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json(event);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/events/:eventId (soft delete)
router.delete('/:eventId', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const eventId = asOptionalString(req.params.eventId);

    if (!eventId) {
      throw new AppError('Invalid event id', 400);
    }

    await ensureEventOwnership(eventId, userId);

    const { error } = await supabase
      .from('events')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
