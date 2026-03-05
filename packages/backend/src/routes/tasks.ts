import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber, asOptionalString } from '../utils/http';
import { AppError } from '../utils/errors';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/request-user';

const router = Router();

async function ensureTaskOwnership(taskId: number, userId: string) {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id,title,description,priority,status,due_date,assigned_to,card_id,created_at,updated_at,cards!inner(id,user_id)')
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

async function appendTaskHistory(taskId: number, userId: string, action: string, changes: Record<string, unknown>) {
  const { error } = await supabase.from('task_history').insert({
    task_id: taskId,
    user_id: userId,
    action,
    changes,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

// POST /api/tasks - Create task
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const title = asOptionalString(req.body?.title);
    const cardId = asNumber(req.body?.cardId, 0);

    if (!title || !cardId) {
      throw new AppError('title and cardId are required', 400);
    }

    await ensureCardOwnership(cardId, userId);

    const payload = {
      title,
      description: asOptionalString(req.body?.description) || null,
      priority: asOptionalString(req.body?.priority) || 'P3',
      status: asOptionalString(req.body?.status) || 'open',
      due_date: asOptionalString(req.body?.dueDate) || null,
      assigned_to: asOptionalString(req.body?.assignedTo) || null,
      card_id: cardId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select('id,title,description,priority,status,due_date,assigned_to,card_id,created_at,updated_at')
      .single();

    if (error) {
      throw error;
    }

    await appendTaskHistory(task.id, userId, 'task.created', {
      title: task.title,
      cardId: task.card_id,
    });

    res.status(201).json({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date,
      assignedTo: task.assigned_to,
      cardId: task.card_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks - List tasks with filters + pagination
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const priority = asOptionalString(req.query.priority);
    const status = asOptionalString(req.query.status);
    const cardId = asNumber(req.query.cardId, 0);
    const limit = Math.min(asNumber(req.query.limit, 50), 200);
    const offset = Math.max(asNumber(req.query.offset, 0), 0);

    let cardsQuery = supabase.from('cards').select('id').eq('user_id', userId);

    if (cardId) {
      cardsQuery = cardsQuery.eq('id', cardId);
    }

    const { data: cards, error: cardsError } = await cardsQuery;

    if (cardsError) {
      throw cardsError;
    }

    const cardIds = (cards || []).map((card) => card.id);

    if (cardIds.length === 0) {
      res.status(200).json({
        items: [],
        pagination: { limit, offset },
      });
      return;
    }

    let tasksQuery = supabase
      .from('tasks')
      .select('id,title,description,priority,status,due_date,assigned_to,card_id,created_at,updated_at')
      .in('card_id', cardIds);

    if (priority) {
      tasksQuery = tasksQuery.eq('priority', priority);
    }

    if (status) {
      tasksQuery = tasksQuery.eq('status', status);
    }

    const { data: tasks, error: tasksError } = await tasksQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tasksError) {
      throw tasksError;
    }

    res.status(200).json({
      items: tasks || [],
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id/history - Task audit history
router.get('/:id/history', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const taskId = asNumber(req.params.id, 0);
    const limit = Math.min(asNumber(req.query.limit, 20), 100);
    const offset = Math.max(asNumber(req.query.offset, 0), 0);

    if (!taskId) {
      throw new AppError('Invalid task id', 400);
    }

    await ensureTaskOwnership(taskId, userId);

    const { data: history, error } = await supabase
      .from('task_history')
      .select('id,task_id,user_id,action,changes,created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      items: history || [],
      pagination: { limit, offset },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const taskId = asNumber(req.params.id, 0);

    if (!taskId) {
      throw new AppError('Invalid task id', 400);
    }

    const existing = await ensureTaskOwnership(taskId, userId);

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

    if (payload.priority !== undefined) {
      const priority = asOptionalString(payload.priority);
      if (!priority) {
        throw new AppError('priority cannot be empty', 422);
      }
      updateData.priority = priority;
    }

    if (payload.status !== undefined) {
      const status = asOptionalString(payload.status);
      if (!status) {
        throw new AppError('status cannot be empty', 422);
      }
      updateData.status = status;
    }

    if (payload.dueDate !== undefined) {
      updateData.due_date = asOptionalString(payload.dueDate) || null;
    }

    if (payload.assignedTo !== undefined) {
      updateData.assigned_to = asOptionalString(payload.assignedTo) || null;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('id,title,description,priority,status,due_date,assigned_to,card_id,updated_at')
      .single();

    if (error) {
      throw error;
    }

    await appendTaskHistory(taskId, userId, 'task.updated', {
      before: {
        title: existing.title,
        description: existing.description,
        priority: existing.priority,
        status: existing.status,
        dueDate: existing.due_date,
        assignedTo: existing.assigned_to,
      },
      after: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        assignedTo: task.assigned_to,
      },
    });

    res.status(200).json({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date,
      assignedTo: task.assigned_to,
      cardId: task.card_id,
      updatedAt: task.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const taskId = asNumber(req.params.id, 0);

    if (!taskId) {
      throw new AppError('Invalid task id', 400);
    }

    await ensureTaskOwnership(taskId, userId);

    await appendTaskHistory(taskId, userId, 'task.deleted', {
      taskId,
    });

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
