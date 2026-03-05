import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber, asOptionalString } from '../utils/http';
import { AppError } from '../utils/errors';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/request-user';

const router = Router();

async function ensureCardOwnership(cardId: number, userId: string) {
  const { data: card, error } = await supabase
    .from('cards')
    .select('id,title,description,column_id,user_id,created_at,updated_at,status,contacts,custom_fields')
    .eq('id', cardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!card) {
    throw new AppError('Card not found', 404);
  }

  return card;
}

async function ensureColumnOwnership(columnId: number, userId: string) {
  const { data: column, error } = await supabase
    .from('columns')
    .select('id,flow_id,name,order')
    .eq('id', columnId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!column) {
    throw new AppError('Column not found', 404);
  }

  const { data: flow, error: flowError } = await supabase
    .from('flows')
    .select('id,user_id')
    .eq('id', column.flow_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (flowError) {
    throw flowError;
  }

  if (!flow) {
    throw new AppError('Forbidden', 403);
  }

  return column;
}

async function appendTimeline(cardId: number, userId: string, action: string, details: Record<string, unknown>) {
  const { error } = await supabase.from('card_timeline_events').insert({
    card_id: cardId,
    user_id: userId,
    action,
    details,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

// POST /api/cards - Create card
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const title = asOptionalString(req.body?.title);
    const description = asOptionalString(req.body?.description);
    const columnId = asNumber(req.body?.columnId, 0);

    if (!title || !columnId) {
      throw new AppError('title and columnId are required', 400);
    }

    await ensureColumnOwnership(columnId, userId);

    const { data: card, error } = await supabase
      .from('cards')
      .insert({
        title,
        description: description || null,
        column_id: columnId,
        user_id: userId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id,title,description,column_id,user_id,created_at,updated_at,status')
      .single();

    if (error) {
      throw error;
    }

    await appendTimeline(card.id, userId, 'card.created', {
      title: card.title,
      columnId: card.column_id,
    });

    res.status(201).json({
      id: card.id,
      title: card.title,
      description: card.description,
      columnId: card.column_id,
      userId: card.user_id,
      status: card.status,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/cards/:id - Get card details
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.id, 0);

    if (!cardId) {
      throw new AppError('Invalid card id', 400);
    }

    const card = await ensureCardOwnership(cardId, userId);

    const [{ data: tasks, error: tasksError }, { data: tags, error: tagsError }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id,title,status,priority,due_date,assigned_to,created_at,updated_at')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false }),
      supabase
        .from('card_tags')
        .select('tag_id,tags(id,name,color,created_at)')
        .eq('card_id', cardId),
    ]);

    if (tasksError) {
      throw tasksError;
    }

    if (tagsError) {
      throw tagsError;
    }

    const totalTasks = (tasks || []).length;
    const completedTasks = (tasks || []).filter((task) => task.status === 'completed').length;

    res.status(200).json({
      id: card.id,
      title: card.title,
      description: card.description,
      columnId: card.column_id,
      userId: card.user_id,
      status: card.status || 'active',
      contacts: card.contacts || [],
      customFields: card.custom_fields || {},
      progress: {
        total: totalTasks,
        completed: completedTasks,
        percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      tasks: tasks || [],
      tags: (tags || []).map((entry: any) => entry.tags).filter(Boolean),
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/cards/:id - Update card metadata
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.id, 0);

    if (!cardId) {
      throw new AppError('Invalid card id', 400);
    }

    await ensureCardOwnership(cardId, userId);

    const payload = req.body || {};
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) {
      const title = asOptionalString(payload.title);
      if (!title) {
        throw new AppError('title cannot be empty', 422);
      }
      updateData.title = title;
    }

    if (payload.description !== undefined) {
      updateData.description = asOptionalString(payload.description) || null;
    }

    if (payload.status !== undefined) {
      const status = asOptionalString(payload.status);
      if (!status) {
        throw new AppError('status cannot be empty', 422);
      }
      updateData.status = status;
    }

    if (payload.contacts !== undefined) {
      updateData.contacts = payload.contacts;
    }

    if (payload.customFields !== undefined) {
      updateData.custom_fields = payload.customFields;
    }

    const { data: card, error } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select('id,title,description,column_id,user_id,status,contacts,custom_fields,updated_at')
      .single();

    if (error) {
      throw error;
    }

    await appendTimeline(card.id, userId, 'card.updated', {
      changedFields: Object.keys(updateData).filter((key) => key !== 'updated_at'),
    });

    res.status(200).json({
      id: card.id,
      title: card.title,
      description: card.description,
      columnId: card.column_id,
      userId: card.user_id,
      status: card.status || 'active',
      contacts: card.contacts || [],
      customFields: card.custom_fields || {},
      updatedAt: card.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/cards/:id/move - Move card to another column
router.patch('/:id/move', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.id, 0);
    const toColumnId = asNumber(req.body?.toColumnId, 0);

    if (!cardId || !toColumnId) {
      throw new AppError('card id and toColumnId are required', 400);
    }

    const currentCard = await ensureCardOwnership(cardId, userId);
    await ensureColumnOwnership(toColumnId, userId);

    if (Number(currentCard.column_id) === toColumnId) {
      throw new AppError('Card is already in target column', 409);
    }

    const { data: movedCard, error } = await supabase
      .from('cards')
      .update({
        column_id: toColumnId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .eq('user_id', userId)
      .select('id,title,column_id,updated_at')
      .single();

    if (error) {
      throw error;
    }

    await appendTimeline(cardId, userId, 'card.moved', {
      fromColumnId: currentCard.column_id,
      toColumnId,
    });

    res.status(200).json({
      id: movedCard.id,
      title: movedCard.title,
      columnId: movedCard.column_id,
      updatedAt: movedCard.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/cards/:id/timeline - List timeline events with pagination
router.get('/:id/timeline', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.id, 0);
    const limit = Math.min(asNumber(req.query.limit, 20), 100);
    const offset = Math.max(asNumber(req.query.offset, 0), 0);

    if (!cardId) {
      throw new AppError('Invalid card id', 400);
    }

    await ensureCardOwnership(cardId, userId);

    const [{ data: timeline, error: timelineError }, { data: linkedEvents, error: linkedEventsError }] =
      await Promise.all([
        supabase
          .from('card_timeline_events')
          .select('id,card_id,user_id,action,details,created_at')
          .eq('card_id', cardId)
          .order('created_at', { ascending: false })
          .range(0, limit + offset),
        supabase
          .from('events')
          .select('id,title,description,starts_at,ends_at,metadata,created_at')
          .eq('card_id', cardId)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(0, limit + offset),
      ]);

    if (timelineError) {
      throw timelineError;
    }

    if (linkedEventsError) {
      throw linkedEventsError;
    }

    const normalizedEvents = (linkedEvents || []).map((event) => ({
      id: `event-${event.id}`,
      card_id: cardId,
      user_id: userId,
      action: 'event.linked',
      details: {
        title: event.title,
        description: event.description,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        metadata: event.metadata || {},
      },
      created_at: event.created_at,
    }));

    const mergedItems = [...(timeline || []), ...normalizedEvents]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(offset, offset + limit);

    res.status(200).json({
      items: mergedItems,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cards/:id/timeline - Add timeline note/event
router.post('/:id/timeline', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.id, 0);
    const action = asOptionalString(req.body?.action) || 'note.added';
    const details = req.body?.details || {};

    if (!cardId) {
      throw new AppError('Invalid card id', 400);
    }

    await ensureCardOwnership(cardId, userId);

    const { data: createdEvent, error } = await supabase
      .from('card_timeline_events')
      .insert({
        card_id: cardId,
        user_id: userId,
        action,
        details,
        created_at: new Date().toISOString(),
      })
      .select('id,card_id,user_id,action,details,created_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(createdEvent);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:id - Hard delete card
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.id, 0);

    if (!cardId) {
      throw new AppError('Invalid card id', 400);
    }

    await ensureCardOwnership(cardId, userId);

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
