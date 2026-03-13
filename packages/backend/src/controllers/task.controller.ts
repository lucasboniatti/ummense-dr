import type { Response } from 'express';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { CreateTaskDTO, UpdateTaskDTO } from '../types/taskflow.types';
import {
  fetchCard,
  fetchOwnedFlow,
  fetchTask,
  isPlainObject,
  isValidIsoDate,
  isValidOptionalText,
  isValidPriority,
  isValidRequiredText,
  isValidStatus,
  isValidUuid,
  normalizeNullableText,
  normalizeRequiredString,
  resolveControllerContext,
  sendTaskflowData,
  sendTaskflowError,
  validateSupabaseAuthUser,
} from './taskflow.controller.shared';

async function fetchOwnedTask(taskId: string, userId: string) {
  const task = await fetchTask(taskId);

  if (!task) {
    return null;
  }

  const card = await fetchCard(task.card_id);

  if (!card) {
    return null;
  }

  const flow = await fetchOwnedFlow(card.flow_id, userId);

  if (!flow) {
    return null;
  }

  return { task, card };
}

export async function listTasks(req: AuthRequest, res: Response) {
  const cardId = req.query.cardId as string | undefined;
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;

  if (!isValidUuid(cardId)) {
    return sendTaskflowError(
      res,
      400,
      'cardId query parameter must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  if (status !== undefined && !isValidStatus(status)) {
    return sendTaskflowError(
      res,
      400,
      'status must be one of open, in_progress, done, blocked',
      'VALIDATION_ERROR'
    );
  }

  if (priority !== undefined && !isValidPriority(priority)) {
    return sendTaskflowError(
      res,
      400,
      'priority must be one of P1, P2, P3',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const card = await fetchCard(cardId);

    if (!card) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    const flow = await fetchOwnedFlow(card.flow_id, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    let query = (supabase as any)
      .from('tasks')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return sendTaskflowData(res, 200, Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('[TaskFlow][listTasks]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to list tasks',
      'INTERNAL_ERROR'
    );
  }
}

export async function createTask(req: AuthRequest, res: Response) {
  if (!isPlainObject(req.body)) {
    return sendTaskflowError(
      res,
      400,
      'Request body must be an object',
      'VALIDATION_ERROR'
    );
  }

  const payload = req.body as unknown as CreateTaskDTO;

  if (!isValidUuid(payload.card_id)) {
    return sendTaskflowError(
      res,
      400,
      'card_id must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  if (!isValidRequiredText(payload.title)) {
    return sendTaskflowError(
      res,
      400,
      'title is required and must be between 1 and 255 characters',
      'VALIDATION_ERROR'
    );
  }

  if (!isValidOptionalText(payload.description, 2000)) {
    return sendTaskflowError(
      res,
      400,
      'description must be a string up to 2000 characters',
      'VALIDATION_ERROR'
    );
  }

  if (payload.priority !== undefined && !isValidPriority(payload.priority)) {
    return sendTaskflowError(
      res,
      400,
      'priority must be one of P1, P2, P3',
      'VALIDATION_ERROR'
    );
  }

  if (payload.status !== undefined && !isValidStatus(payload.status)) {
    return sendTaskflowError(
      res,
      400,
      'status must be one of open, in_progress, done, blocked',
      'VALIDATION_ERROR'
    );
  }

  if (payload.due_date !== undefined && payload.due_date !== null && !isValidIsoDate(payload.due_date)) {
    return sendTaskflowError(
      res,
      400,
      'due_date must be a valid ISO date (YYYY-MM-DD)',
      'VALIDATION_ERROR'
    );
  }

  if (payload.assigned_to !== undefined && payload.assigned_to !== null && !isValidUuid(payload.assigned_to)) {
    return sendTaskflowError(
      res,
      400,
      'assigned_to must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const card = await fetchCard(payload.card_id);

    if (!card) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    const flow = await fetchOwnedFlow(card.flow_id, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    if (payload.assigned_to) {
      const assignedUserExists = await validateSupabaseAuthUser(payload.assigned_to);

      if (!assignedUserExists) {
        return sendTaskflowError(
          res,
          400,
          'assigned_to must reference an existing auth user',
          'VALIDATION_ERROR'
        );
      }
    }

    const { data, error } = await (supabase as any)
      .from('tasks')
      .insert({
        card_id: payload.card_id,
        title: normalizeRequiredString(payload.title),
        description: normalizeNullableText(payload.description) ?? null,
        priority: payload.priority || 'P3',
        status: payload.status || 'open',
        due_date: payload.due_date ?? null,
        assigned_to: payload.assigned_to ?? null,
        created_by: context.userId,
      })
      .select();

    if (error) {
      throw error;
    }

    return sendTaskflowData(res, 201, Array.isArray(data) ? data[0] : null);
  } catch (error) {
    console.error('[TaskFlow][createTask]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to create task',
      'INTERNAL_ERROR'
    );
  }
}

export async function updateTask(req: AuthRequest, res: Response) {
  const taskId = req.params.taskId || req.params.id;

  if (!isValidUuid(taskId)) {
    return sendTaskflowError(
      res,
      400,
      'taskId must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  if (!isPlainObject(req.body)) {
    return sendTaskflowError(
      res,
      400,
      'Request body must be an object',
      'VALIDATION_ERROR'
    );
  }

  const payload = req.body as UpdateTaskDTO;
  const updateData: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    if (!isValidRequiredText(payload.title)) {
      return sendTaskflowError(
        res,
        400,
        'title must be between 1 and 255 characters',
        'VALIDATION_ERROR'
      );
    }

    updateData.title = normalizeRequiredString(payload.title);
  }

  if (payload.description !== undefined) {
    if (!isValidOptionalText(payload.description, 2000)) {
      return sendTaskflowError(
        res,
        400,
        'description must be a string up to 2000 characters',
        'VALIDATION_ERROR'
      );
    }

    updateData.description = normalizeNullableText(payload.description) ?? null;
  }

  if (payload.priority !== undefined) {
    if (!isValidPriority(payload.priority)) {
      return sendTaskflowError(
        res,
        400,
        'priority must be one of P1, P2, P3',
        'VALIDATION_ERROR'
      );
    }

    updateData.priority = payload.priority;
  }

  if (payload.status !== undefined) {
    if (!isValidStatus(payload.status)) {
      return sendTaskflowError(
        res,
        400,
        'status must be one of open, in_progress, done, blocked',
        'VALIDATION_ERROR'
      );
    }

    updateData.status = payload.status;
  }

  if (payload.due_date !== undefined) {
    if (payload.due_date !== null && !isValidIsoDate(payload.due_date)) {
      return sendTaskflowError(
        res,
        400,
        'due_date must be a valid ISO date (YYYY-MM-DD)',
        'VALIDATION_ERROR'
      );
    }

    updateData.due_date = payload.due_date;
  }

  if (payload.assigned_to !== undefined) {
    if (payload.assigned_to !== null && !isValidUuid(payload.assigned_to)) {
      return sendTaskflowError(
        res,
        400,
        'assigned_to must be a valid UUID',
        'VALIDATION_ERROR'
      );
    }

    updateData.assigned_to = payload.assigned_to;
  }

  if (Object.keys(updateData).length === 0) {
    return sendTaskflowError(
      res,
      400,
      'At least one field must be provided',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const ownedTask = await fetchOwnedTask(taskId, context.userId);

    if (!ownedTask) {
      return sendTaskflowError(res, 404, 'Task not found', 'NOT_FOUND');
    }

    if (payload.assigned_to) {
      const assignedUserExists = await validateSupabaseAuthUser(payload.assigned_to);

      if (!assignedUserExists) {
        return sendTaskflowError(
          res,
          400,
          'assigned_to must reference an existing auth user',
          'VALIDATION_ERROR'
        );
      }
    }

    const { data, error } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', ownedTask.task.id)
      .eq('card_id', ownedTask.card.id)
      .select();

    if (error) {
      throw error;
    }

    return sendTaskflowData(
      res,
      200,
      Array.isArray(data) ? data[0] : ownedTask.task
    );
  } catch (error) {
    console.error('[TaskFlow][updateTask]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to update task',
      'INTERNAL_ERROR'
    );
  }
}

export async function deleteTask(req: AuthRequest, res: Response) {
  const taskId = req.params.taskId || req.params.id;

  if (!isValidUuid(taskId)) {
    return sendTaskflowError(
      res,
      400,
      'taskId must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const ownedTask = await fetchOwnedTask(taskId, context.userId);

    if (!ownedTask) {
      return sendTaskflowError(res, 404, 'Task not found', 'NOT_FOUND');
    }

    const { error } = await (supabase as any)
      .from('tasks')
      .delete()
      .eq('id', ownedTask.task.id)
      .eq('card_id', ownedTask.card.id);

    if (error) {
      throw error;
    }

    return res.status(204).send();
  } catch (error) {
    console.error('[TaskFlow][deleteTask]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to delete task',
      'INTERNAL_ERROR'
    );
  }
}

export const taskController = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
};
