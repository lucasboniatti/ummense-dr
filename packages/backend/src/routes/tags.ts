import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber, asOptionalString } from '../utils/http';
import { AppError } from '../utils/errors';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/request-user';

const router = Router();

async function ensureTagOwnership(tagId: number, userId: string) {
  const { data: tag, error } = await supabase
    .from('tags')
    .select('id,name,color,user_id,created_at')
    .eq('id', tagId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  return tag;
}

async function ensureCardOwnership(cardId: number, userId: string) {
  const { data: card, error } = await supabase
    .from('cards')
    .select('id,user_id')
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

async function ensureTaskOwnership(taskId: number, userId: string) {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id,card_id,cards!inner(id,user_id)')
    .eq('id', taskId)
    .eq('cards.user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  return task;
}

// POST /api/tags - Create tag
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const name = asOptionalString(req.body?.name);
    const color = asOptionalString(req.body?.color);

    if (!name || !color) {
      throw new AppError('name and color are required', 400);
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name,
        color,
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      .select('id,name,color,user_id,created_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      userId: tag.user_id,
      createdAt: tag.created_at,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tags - List user's tags
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const { data: tags, error } = await supabase
      .from('tags')
      .select('id,name,color,user_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(tags || []);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tags/:id - Update tag
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const tagId = asNumber(req.params.id, 0);

    if (!tagId) {
      throw new AppError('Invalid tag id', 400);
    }

    await ensureTagOwnership(tagId, userId);

    const updateData: Record<string, unknown> = {};

    if (req.body?.name !== undefined) {
      const name = asOptionalString(req.body.name);
      if (!name) {
        throw new AppError('name cannot be empty', 422);
      }
      updateData.name = name;
    }

    if (req.body?.color !== undefined) {
      const color = asOptionalString(req.body.color);
      if (!color) {
        throw new AppError('color cannot be empty', 422);
      }
      updateData.color = color;
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', tagId)
      .eq('user_id', userId)
      .select('id,name,color,user_id,created_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json(tag);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tags/:id - Delete tag
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const tagId = asNumber(req.params.id, 0);

    if (!tagId) {
      throw new AppError('Invalid tag id', 400);
    }

    await ensureTagOwnership(tagId, userId);

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/tags/cards/:cardId/tags/:tagId - Add tag to card
router.post('/cards/:cardId/tags/:tagId', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.cardId, 0);
    const tagId = asNumber(req.params.tagId, 0);

    if (!cardId || !tagId) {
      throw new AppError('Invalid card id or tag id', 400);
    }

    await ensureCardOwnership(cardId, userId);
    await ensureTagOwnership(tagId, userId);

    const { error } = await supabase.from('card_tags').insert({
      card_id: cardId,
      tag_id: tagId,
    });

    if (error) {
      if (String((error as any).code) === '23505') {
        throw new AppError('Tag already assigned to card', 409);
      }
      throw error;
    }

    res.status(201).json({ cardId, tagId });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tags/cards/:cardId/tags/:tagId - Remove tag from card
router.delete('/cards/:cardId/tags/:tagId', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const cardId = asNumber(req.params.cardId, 0);
    const tagId = asNumber(req.params.tagId, 0);

    if (!cardId || !tagId) {
      throw new AppError('Invalid card id or tag id', 400);
    }

    await ensureCardOwnership(cardId, userId);
    await ensureTagOwnership(tagId, userId);

    const { error } = await supabase
      .from('card_tags')
      .delete()
      .eq('card_id', cardId)
      .eq('tag_id', tagId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/tags/tasks/:taskId/tags - List task tags
router.get('/tasks/:taskId/tags', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const taskId = asNumber(req.params.taskId, 0);

    if (!taskId) {
      throw new AppError('Invalid task id', 400);
    }

    await ensureTaskOwnership(taskId, userId);

    const { data, error } = await supabase
      .from('task_tags')
      .select('tag_id,tags(id,name,color,created_at)')
      .eq('task_id', taskId);

    if (error) {
      throw error;
    }

    const tags = (data || [])
      .map((row: any) => row.tags)
      .filter(Boolean);

    res.status(200).json(tags);
  } catch (error) {
    next(error);
  }
});

// POST /api/tags/tasks/:taskId/tags/:tagId - Add tag to task
router.post('/tasks/:taskId/tags/:tagId', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const taskId = asNumber(req.params.taskId, 0);
    const tagId = asNumber(req.params.tagId, 0);

    if (!taskId || !tagId) {
      throw new AppError('Invalid task id or tag id', 400);
    }

    await ensureTaskOwnership(taskId, userId);
    await ensureTagOwnership(tagId, userId);

    const { error } = await supabase.from('task_tags').insert({
      task_id: taskId,
      tag_id: tagId,
    });

    if (error) {
      if (String((error as any).code) === '23505') {
        throw new AppError('Tag already assigned to task', 409);
      }
      throw error;
    }

    res.status(201).json({ taskId, tagId });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tags/tasks/:taskId/tags/:tagId - Remove tag from task
router.delete('/tasks/:taskId/tags/:tagId', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const taskId = asNumber(req.params.taskId, 0);
    const tagId = asNumber(req.params.tagId, 0);

    if (!taskId || !tagId) {
      throw new AppError('Invalid task id or tag id', 400);
    }

    await ensureTaskOwnership(taskId, userId);
    await ensureTagOwnership(tagId, userId);

    const { error } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
