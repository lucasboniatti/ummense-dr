import type { Response } from 'express';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/auth.middleware';
import type {
  CreateFlowColumnDTO,
  CreateFlowDTO,
  FlowColumnWithCards,
  FlowWithColumns,
  ReorderColumnsDTO,
  UpdateFlowColumnDTO,
  UpdateFlowDTO,
} from '../types/taskflow.types';
import {
  DEFAULT_FLOW_COLUMNS,
  fetchCardSummaryMap,
  fetchFlowColumn,
  fetchOwnedFlow,
  isPlainObject,
  isValidColor,
  isValidOptionalText,
  isValidRequiredText,
  isValidUuid,
  normalizeNullableText,
  normalizeRequiredString,
  resolveControllerContext,
  sendTaskflowData,
  sendTaskflowError,
} from './taskflow.controller.shared';

export async function listFlows(req: AuthRequest, res: Response) {
  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const { data, error } = await (supabase as any)
      .from('flows')
      .select('*')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const flows = Array.isArray(data) ? data : [];
    const flowIds = flows.map((flow) => flow.id);
    const columnCountByFlow: Record<string, number> = {};
    const cardCountByFlow: Record<string, number> = {};

    if (flowIds.length > 0) {
      const [{ data: columns, error: columnsError }, { data: cards, error: cardsError }] =
        await Promise.all([
          (supabase as any)
            .from('flow_columns')
            .select('flow_id')
            .in('flow_id', flowIds),
          (supabase as any).from('cards').select('flow_id').in('flow_id', flowIds),
        ]);

      if (columnsError) {
        throw columnsError;
      }

      if (cardsError) {
        throw cardsError;
      }

      for (const column of Array.isArray(columns) ? columns : []) {
        columnCountByFlow[column.flow_id] =
          (columnCountByFlow[column.flow_id] || 0) + 1;
      }

      for (const card of Array.isArray(cards) ? cards : []) {
        cardCountByFlow[card.flow_id] = (cardCountByFlow[card.flow_id] || 0) + 1;
      }
    }

    return sendTaskflowData(
      res,
      200,
      flows.map((flow) => ({
        ...flow,
        column_count: columnCountByFlow[flow.id] || 0,
        card_count: cardCountByFlow[flow.id] || 0,
      }))
    );
  } catch (error) {
    console.error('[TaskFlow][listFlows]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to list flows',
      'INTERNAL_ERROR'
    );
  }
}

export async function getFlow(req: AuthRequest, res: Response) {
  const flowId = req.params.flowId || req.params.id;

  if (!isValidUuid(flowId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const flow = await fetchOwnedFlow(flowId, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const [{ data: columns, error: columnsError }, { data: cards, error: cardsError }] =
      await Promise.all([
        (supabase as any)
          .from('flow_columns')
          .select('*')
          .eq('flow_id', flowId)
          .order('order_index', { ascending: true }),
        (supabase as any)
          .from('cards')
          .select('*')
          .eq('flow_id', flowId)
          .order('order_index', { ascending: true }),
      ]);

    if (columnsError) {
      throw columnsError;
    }

    if (cardsError) {
      throw cardsError;
    }

    const safeCards = Array.isArray(cards) ? cards : [];
    const summaries = await fetchCardSummaryMap(safeCards.map((card) => card.id));
    const cardsByColumn: Record<string, any[]> = {};

    for (const card of safeCards) {
      if (!cardsByColumn[card.column_id]) {
        cardsByColumn[card.column_id] = [];
      }

      cardsByColumn[card.column_id].push({
        ...card,
        task_summary: summaries[card.id] || { total: 0, done: 0, open: 0 },
      });
    }

    const flowWithColumns: FlowWithColumns = {
      ...flow,
      columns: (Array.isArray(columns) ? columns : []).map((column) => ({
        ...column,
        cards: cardsByColumn[column.id] || [],
      })) as FlowColumnWithCards[],
    };

    return sendTaskflowData(res, 200, flowWithColumns);
  } catch (error) {
    console.error('[TaskFlow][getFlow]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to load flow',
      'INTERNAL_ERROR'
    );
  }
}

export async function createFlow(req: AuthRequest, res: Response) {
  if (!isPlainObject(req.body)) {
    return sendTaskflowError(
      res,
      400,
      'Request body must be an object',
      'VALIDATION_ERROR'
    );
  }

  const payload = req.body as unknown as CreateFlowDTO;

  if (!isValidRequiredText(payload.name)) {
    return sendTaskflowError(
      res,
      400,
      'name is required and must be between 1 and 255 characters',
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

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const { data, error } = await (supabase as any)
      .from('flows')
      .insert({
        user_id: context.userId,
        name: normalizeRequiredString(payload.name),
        description: normalizeNullableText(payload.description) ?? null,
      })
      .select();

    if (error) {
      throw error;
    }

    const flow = Array.isArray(data) ? data[0] : null;

    if (!flow) {
      throw new Error('Flow insert did not return a record');
    }

    const { data: columns, error: columnsError } = await (supabase as any)
      .from('flow_columns')
      .insert(
        DEFAULT_FLOW_COLUMNS.map((column) => ({
          flow_id: flow.id,
          name: column.name,
          color: column.color,
          order_index: column.order_index,
        }))
      )
      .select();

    if (columnsError) {
      await (supabase as any).from('flows').delete().eq('id', flow.id);
      throw columnsError;
    }

    return sendTaskflowData(res, 201, {
      ...flow,
      columns: Array.isArray(columns) ? columns : [],
    });
  } catch (error) {
    console.error('[TaskFlow][createFlow]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to create flow',
      'INTERNAL_ERROR'
    );
  }
}

export async function updateFlow(req: AuthRequest, res: Response) {
  const flowId = req.params.flowId || req.params.id;

  if (!isValidUuid(flowId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId must be a valid UUID',
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

  const payload = req.body as UpdateFlowDTO;
  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    if (!isValidRequiredText(payload.name)) {
      return sendTaskflowError(
        res,
        400,
        'name must be between 1 and 255 characters',
        'VALIDATION_ERROR'
      );
    }

    updateData.name = normalizeRequiredString(payload.name);
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
    const existingFlow = await fetchOwnedFlow(flowId, context.userId);

    if (!existingFlow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const { data, error } = await (supabase as any)
      .from('flows')
      .update(updateData)
      .eq('id', flowId)
      .eq('user_id', context.userId)
      .select();

    if (error) {
      throw error;
    }

    return sendTaskflowData(res, 200, Array.isArray(data) ? data[0] : existingFlow);
  } catch (error) {
    console.error('[TaskFlow][updateFlow]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to update flow',
      'INTERNAL_ERROR'
    );
  }
}

export async function deleteFlow(req: AuthRequest, res: Response) {
  const flowId = req.params.flowId || req.params.id;

  if (!isValidUuid(flowId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const existingFlow = await fetchOwnedFlow(flowId, context.userId);

    if (!existingFlow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const { error } = await (supabase as any)
      .from('flows')
      .delete()
      .eq('id', flowId)
      .eq('user_id', context.userId);

    if (error) {
      throw error;
    }

    return res.status(204).send();
  } catch (error) {
    console.error('[TaskFlow][deleteFlow]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to delete flow',
      'INTERNAL_ERROR'
    );
  }
}

export async function addColumn(req: AuthRequest, res: Response) {
  const flowId = req.params.flowId || req.params.id;

  if (!isValidUuid(flowId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId must be a valid UUID',
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

  const payload = req.body as unknown as CreateFlowColumnDTO;

  if (!isValidRequiredText(payload.name)) {
    return sendTaskflowError(
      res,
      400,
      'name is required and must be between 1 and 255 characters',
      'VALIDATION_ERROR'
    );
  }

  if (payload.color !== undefined && !isValidColor(payload.color)) {
    return sendTaskflowError(
      res,
      400,
      'color must be a valid hex value like #3B82F6',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const flow = await fetchOwnedFlow(flowId, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const { data: existingColumns, error: columnsError } = await (supabase as any)
      .from('flow_columns')
      .select('id, order_index')
      .eq('flow_id', flowId)
      .order('order_index', { ascending: false })
      .limit(1);

    if (columnsError) {
      throw columnsError;
    }

    const nextOrderIndex =
      Array.isArray(existingColumns) && existingColumns.length > 0
        ? Number(existingColumns[0].order_index) + 1
        : 0;

    const { data, error } = await (supabase as any)
      .from('flow_columns')
      .insert({
        flow_id: flowId,
        name: normalizeRequiredString(payload.name),
        color: payload.color || '#6B7280',
        order_index: nextOrderIndex,
      })
      .select();

    if (error) {
      throw error;
    }

    return sendTaskflowData(res, 201, Array.isArray(data) ? data[0] : null);
  } catch (error) {
    console.error('[TaskFlow][addColumn]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to add column',
      'INTERNAL_ERROR'
    );
  }
}

export async function updateColumn(req: AuthRequest, res: Response) {
  const flowId = req.params.flowId || req.params.id;
  const columnId = req.params.columnId;

  if (!isValidUuid(flowId) || !isValidUuid(columnId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId and columnId must be valid UUIDs',
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

  const payload = req.body as UpdateFlowColumnDTO;
  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    if (!isValidRequiredText(payload.name)) {
      return sendTaskflowError(
        res,
        400,
        'name must be between 1 and 255 characters',
        'VALIDATION_ERROR'
      );
    }

    updateData.name = normalizeRequiredString(payload.name);
  }

  if (payload.color !== undefined) {
    if (!isValidColor(payload.color)) {
      return sendTaskflowError(
        res,
        400,
        'color must be a valid hex value like #3B82F6',
        'VALIDATION_ERROR'
      );
    }

    updateData.color = payload.color;
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
    const flow = await fetchOwnedFlow(flowId, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const existingColumn = await fetchFlowColumn(flowId, columnId);

    if (!existingColumn) {
      return sendTaskflowError(res, 404, 'Column not found', 'NOT_FOUND');
    }

    const { data, error } = await (supabase as any)
      .from('flow_columns')
      .update(updateData)
      .eq('id', columnId)
      .eq('flow_id', flowId)
      .select();

    if (error) {
      throw error;
    }

    return sendTaskflowData(
      res,
      200,
      Array.isArray(data) ? data[0] : existingColumn
    );
  } catch (error) {
    console.error('[TaskFlow][updateColumn]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to update column',
      'INTERNAL_ERROR'
    );
  }
}

export async function reorderColumns(req: AuthRequest, res: Response) {
  const flowId = req.params.flowId || req.params.id;

  if (!isValidUuid(flowId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId must be a valid UUID',
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

  const payload = req.body as unknown as ReorderColumnsDTO;

  if (
    !Array.isArray(payload.column_ids) ||
    payload.column_ids.length === 0 ||
    payload.column_ids.some((columnId) => !isValidUuid(columnId))
  ) {
    return sendTaskflowError(
      res,
      400,
      'column_ids must be a non-empty array of UUIDs',
      'VALIDATION_ERROR'
    );
  }

  if (new Set(payload.column_ids).size !== payload.column_ids.length) {
    return sendTaskflowError(
      res,
      400,
      'column_ids must not contain duplicates',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const flow = await fetchOwnedFlow(flowId, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const { data: existingColumns, error: columnsError } = await (supabase as any)
      .from('flow_columns')
      .select('*')
      .eq('flow_id', flowId)
      .order('order_index', { ascending: true });

    if (columnsError) {
      throw columnsError;
    }

    const safeColumns = Array.isArray(existingColumns) ? existingColumns : [];
    const existingIds = new Set(safeColumns.map((column) => column.id));

    if (
      payload.column_ids.length !== safeColumns.length ||
      payload.column_ids.some((columnId) => !existingIds.has(columnId))
    ) {
      return sendTaskflowError(
        res,
        400,
        'column_ids must contain each flow column exactly once',
        'VALIDATION_ERROR'
      );
    }

    const columnMap = new Map(safeColumns.map((column) => [column.id, column]));
    const reorderedColumns = payload.column_ids.map((columnId, orderIndex) => {
      const existingColumn = columnMap.get(columnId);

      if (!existingColumn) {
        throw new Error(`Missing column ${columnId} during atomic reorder`);
      }

      return {
        ...existingColumn,
        order_index: orderIndex,
      };
    });

    const { error: upsertError } = await (supabase as any)
      .from('flow_columns')
      .upsert(reorderedColumns, { onConflict: 'id' });

    if (upsertError) {
      throw upsertError;
    }

    return sendTaskflowData(res, 200, {
      columns: payload.column_ids.map((columnId, orderIndex) => ({
        ...columnMap.get(columnId),
        order_index: orderIndex,
      })),
    });
  } catch (error) {
    console.error('[TaskFlow][reorderColumns]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to reorder columns',
      'INTERNAL_ERROR'
    );
  }
}

export async function deleteColumn(req: AuthRequest, res: Response) {
  const flowId = req.params.flowId || req.params.id;
  const columnId = req.params.columnId;

  if (!isValidUuid(flowId) || !isValidUuid(columnId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId and columnId must be valid UUIDs',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const flow = await fetchOwnedFlow(flowId, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const existingColumn = await fetchFlowColumn(flowId, columnId);

    if (!existingColumn) {
      return sendTaskflowError(res, 404, 'Column not found', 'NOT_FOUND');
    }

    const { data: cards, error: cardsError } = await (supabase as any)
      .from('cards')
      .select('id')
      .eq('column_id', columnId)
      .limit(1);

    if (cardsError) {
      throw cardsError;
    }

    if (Array.isArray(cards) && cards.length > 0) {
      return sendTaskflowError(
        res,
        409,
        'Cannot delete column with cards. Move cards first.',
        'CONFLICT'
      );
    }

    const { error } = await (supabase as any)
      .from('flow_columns')
      .delete()
      .eq('id', columnId)
      .eq('flow_id', flowId);

    if (error) {
      throw error;
    }

    return res.status(204).send();
  } catch (error) {
    console.error('[TaskFlow][deleteColumn]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to delete column',
      'INTERNAL_ERROR'
    );
  }
}

export const flowController = {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  addColumn,
  updateColumn,
  reorderColumns,
  deleteColumn,
};
