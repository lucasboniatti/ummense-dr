import type { Response } from 'express';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/auth.middleware';
import type {
  Card,
  CardWithTasks,
  CreateCardDTO,
  ReorderCardsDTO,
  UpdateCardDTO,
} from '../types/taskflow.types';
import {
  clampOrderIndex,
  fetchCard,
  fetchCardSummaryMap,
  fetchCardsForColumn,
  fetchFlowColumn,
  fetchOwnedFlow,
  isPlainObject,
  isValidOptionalText,
  isValidOrderIndex,
  isValidRequiredText,
  isValidUuid,
  normalizeNullableText,
  normalizeRequiredString,
  resolveControllerContext,
  sendTaskflowData,
  sendTaskflowError,
} from './taskflow.controller.shared';

async function syncColumnOrder(
  flowId: string,
  orderedCardIds: string[],
  updatesById: Record<string, Record<string, unknown>> = {}
) {
  await Promise.all(
    orderedCardIds.map(async (cardId, orderIndex) => {
      const { error } = await (supabase as any)
        .from('cards')
        .update({
          order_index: orderIndex,
          ...updatesById[cardId],
        })
        .eq('id', cardId)
        .eq('flow_id', flowId);

      if (error) {
        throw error;
      }
    })
  );
}

async function fetchOwnedCard(cardId: string, userId: string) {
  const card = await fetchCard(cardId);

  if (!card) {
    return null;
  }

  const flow = await fetchOwnedFlow(card.flow_id, userId);
  return flow ? card : null;
}

export async function listCards(req: AuthRequest, res: Response) {
  const flowId = req.query.flowId as string | undefined;

  if (!isValidUuid(flowId)) {
    return sendTaskflowError(
      res,
      400,
      'flowId query parameter must be a valid UUID',
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
        (supabase as any).from('flow_columns').select('id, name').eq('flow_id', flowId),
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
    const columnNameById = new Map(
      (Array.isArray(columns) ? columns : []).map((column) => [column.id, column.name])
    );

    return sendTaskflowData(
      res,
      200,
      safeCards.map((card) => ({
        ...card,
        column_name: columnNameById.get(card.column_id) || null,
        task_summary: summaries[card.id] || { total: 0, done: 0, open: 0 },
      }))
    );
  } catch (error) {
    console.error('[TaskFlow][listCards]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to list cards',
      'INTERNAL_ERROR'
    );
  }
}

export async function getCard(req: AuthRequest, res: Response) {
  const cardId = req.params.cardId || req.params.id;

  if (!isValidUuid(cardId)) {
    return sendTaskflowError(
      res,
      400,
      'cardId must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const card = await fetchOwnedCard(cardId, context.userId);

    if (!card) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    const [{ data: tasks, error: tasksError }, { data: columns, error: columnsError }, { data: flows, error: flowsError }] =
      await Promise.all([
        (supabase as any)
          .from('tasks')
          .select('*')
          .eq('card_id', cardId)
          .order('created_at', { ascending: true }),
        (supabase as any)
          .from('flow_columns')
          .select('id, name')
          .eq('id', card.column_id)
          .limit(1),
        (supabase as any)
          .from('flows')
          .select('id, name')
          .eq('id', card.flow_id)
          .eq('user_id', context.userId)
          .limit(1),
      ]);

    if (tasksError) {
      throw tasksError;
    }

    if (columnsError) {
      throw columnsError;
    }

    if (flowsError) {
      throw flowsError;
    }

    const flow = Array.isArray(flows) ? flows[0] : null;
    const column = Array.isArray(columns) ? columns[0] : null;

    const response: CardWithTasks = {
      ...card,
      column_name: column?.name || '',
      flow_name: flow?.name || '',
      tasks: Array.isArray(tasks) ? tasks : [],
    };

    return sendTaskflowData(res, 200, response);
  } catch (error) {
    console.error('[TaskFlow][getCard]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to load card',
      'INTERNAL_ERROR'
    );
  }
}

export async function createCard(req: AuthRequest, res: Response) {
  if (!isPlainObject(req.body)) {
    return sendTaskflowError(
      res,
      400,
      'Request body must be an object',
      'VALIDATION_ERROR'
    );
  }

  const payload = req.body as unknown as CreateCardDTO;

  if (!isValidUuid(payload.flow_id) || !isValidUuid(payload.column_id)) {
    return sendTaskflowError(
      res,
      400,
      'flow_id and column_id must be valid UUIDs',
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

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const flow = await fetchOwnedFlow(payload.flow_id, context.userId);

    if (!flow) {
      return sendTaskflowError(res, 404, 'Flow not found', 'NOT_FOUND');
    }

    const column = await fetchFlowColumn(payload.flow_id, payload.column_id);

    if (!column) {
      return sendTaskflowError(
        res,
        400,
        'column_id must belong to the selected flow',
        'VALIDATION_ERROR'
      );
    }

    const { data: existingCards, error: cardsError } = await (supabase as any)
      .from('cards')
      .select('id, order_index')
      .eq('column_id', payload.column_id)
      .order('order_index', { ascending: false })
      .limit(1);

    if (cardsError) {
      throw cardsError;
    }

    const nextOrderIndex =
      Array.isArray(existingCards) && existingCards.length > 0
        ? Number(existingCards[0].order_index) + 1
        : 0;

    const { data, error } = await (supabase as any)
      .from('cards')
      .insert({
        flow_id: payload.flow_id,
        column_id: payload.column_id,
        title: normalizeRequiredString(payload.title),
        description: normalizeNullableText(payload.description) ?? null,
        order_index: nextOrderIndex,
        created_by: context.userId,
      })
      .select();

    if (error) {
      throw error;
    }

    return sendTaskflowData(res, 201, Array.isArray(data) ? data[0] : null);
  } catch (error) {
    console.error('[TaskFlow][createCard]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to create card',
      'INTERNAL_ERROR'
    );
  }
}

export async function updateCard(req: AuthRequest, res: Response) {
  const cardId = req.params.cardId || req.params.id;

  if (!isValidUuid(cardId)) {
    return sendTaskflowError(
      res,
      400,
      'cardId must be a valid UUID',
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

  const payload = req.body as UpdateCardDTO;
  const titleUpdate =
    payload.title !== undefined ? normalizeRequiredString(payload.title) : undefined;
  const descriptionUpdate =
    payload.description !== undefined
      ? normalizeNullableText(payload.description)
      : undefined;

  if (payload.title !== undefined && !isValidRequiredText(payload.title)) {
    return sendTaskflowError(
      res,
      400,
      'title must be between 1 and 255 characters',
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

  if (payload.column_id !== undefined && !isValidUuid(payload.column_id)) {
    return sendTaskflowError(
      res,
      400,
      'column_id must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  if (
    payload.order_index !== undefined &&
    !isValidOrderIndex(payload.order_index)
  ) {
    return sendTaskflowError(
      res,
      400,
      'order_index must be a non-negative integer',
      'VALIDATION_ERROR'
    );
  }

  if (
    payload.title === undefined &&
    payload.description === undefined &&
    payload.column_id === undefined &&
    payload.order_index === undefined
  ) {
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
    const existingCard = await fetchOwnedCard(cardId, context.userId);

    if (!existingCard) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    const targetColumnId = payload.column_id || existingCard.column_id;

    if (targetColumnId !== existingCard.column_id || payload.order_index !== undefined) {
      const targetColumn = await fetchFlowColumn(existingCard.flow_id, targetColumnId);

      if (!targetColumn) {
        return sendTaskflowError(
          res,
          400,
          'column_id must belong to the selected flow',
          'VALIDATION_ERROR'
        );
      }

      if (targetColumnId !== existingCard.column_id) {
        const oldColumnCards = await fetchCardsForColumn(
          existingCard.column_id,
          existingCard.id
        );

        await syncColumnOrder(
          existingCard.flow_id,
          oldColumnCards.map((card) => card.id)
        );
      }

      const targetCards = await fetchCardsForColumn(targetColumnId, existingCard.id);
      const targetCardIds = targetCards.map((card) => card.id);
      const targetIndex = clampOrderIndex(
        payload.order_index ?? targetCardIds.length,
        targetCardIds.length
      );

      targetCardIds.splice(targetIndex, 0, existingCard.id);

      await syncColumnOrder(existingCard.flow_id, targetCardIds, {
        [existingCard.id]: {
          column_id: targetColumnId,
          ...(titleUpdate !== undefined ? { title: titleUpdate } : {}),
          ...(descriptionUpdate !== undefined ? { description: descriptionUpdate } : {}),
        },
      });

      const updatedCard = await fetchCard(existingCard.id);
      return sendTaskflowData(
        res,
        200,
        updatedCard || {
          ...existingCard,
          column_id: targetColumnId,
          order_index: targetIndex,
          ...(titleUpdate !== undefined ? { title: titleUpdate } : {}),
          ...(descriptionUpdate !== undefined
            ? { description: descriptionUpdate ?? null }
            : {}),
        }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (titleUpdate !== undefined) {
      updateData.title = titleUpdate;
    }

    if (descriptionUpdate !== undefined) {
      updateData.description = descriptionUpdate ?? null;
    }

    const { data, error } = await (supabase as any)
      .from('cards')
      .update(updateData)
      .eq('id', existingCard.id)
      .eq('flow_id', existingCard.flow_id)
      .select();

    if (error) {
      throw error;
    }

    return sendTaskflowData(
      res,
      200,
      Array.isArray(data) ? data[0] : existingCard
    );
  } catch (error) {
    console.error('[TaskFlow][updateCard]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to update card',
      'INTERNAL_ERROR'
    );
  }
}

export async function reorderCards(req: AuthRequest, res: Response) {
  if (!isPlainObject(req.body)) {
    return sendTaskflowError(
      res,
      400,
      'Request body must be an object',
      'VALIDATION_ERROR'
    );
  }

  const payload = req.body as unknown as ReorderCardsDTO;

  if (!Array.isArray(payload.moves) || payload.moves.length === 0) {
    return sendTaskflowError(
      res,
      400,
      'moves must be a non-empty array',
      'VALIDATION_ERROR'
    );
  }

  for (const move of payload.moves) {
    if (
      !isValidUuid(move.card_id) ||
      !isValidUuid(move.column_id) ||
      !isValidOrderIndex(move.order_index)
    ) {
      return sendTaskflowError(
        res,
        400,
        'Each move must contain valid card_id, column_id, and order_index',
        'VALIDATION_ERROR'
      );
    }
  }

  if (
    new Set(payload.moves.map((move) => move.card_id)).size !== payload.moves.length
  ) {
    return sendTaskflowError(
      res,
      400,
      'moves must not contain duplicate card_id values',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const cardIds = payload.moves.map((move) => move.card_id);
    const targetColumnIds = [...new Set(payload.moves.map((move) => move.column_id))];

    const [{ data: cards, error: cardsError }, { data: columns, error: columnsError }] =
      await Promise.all([
        (supabase as any).from('cards').select('*').in('id', cardIds),
        (supabase as any).from('flow_columns').select('*').in('id', targetColumnIds),
      ]);

    if (cardsError) {
      throw cardsError;
    }

    if (columnsError) {
      throw columnsError;
    }

    const safeCards = Array.isArray(cards) ? (cards as Card[]) : [];

    if (safeCards.length !== payload.moves.length) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    const flowIds = [...new Set(safeCards.map((card) => card.flow_id))];
    const { data: flows, error: flowsError } = await (supabase as any)
      .from('flows')
      .select('id')
      .in('id', flowIds)
      .eq('user_id', context.userId);

    if (flowsError) {
      throw flowsError;
    }

    const ownedFlowIds = new Set(
      (Array.isArray(flows) ? flows : []).map((flow) => flow.id)
    );

    if (ownedFlowIds.size !== flowIds.length) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    const columnById = new Map(
      (Array.isArray(columns) ? columns : []).map((column) => [column.id, column])
    );
    const cardById = new Map(safeCards.map((card) => [card.id, card]));

    for (const move of payload.moves) {
      const card = cardById.get(move.card_id);
      const targetColumn = columnById.get(move.column_id);

      if (!card || !targetColumn || targetColumn.flow_id !== card.flow_id) {
        return sendTaskflowError(
          res,
          400,
          'Each move must keep the card inside its current flow',
          'VALIDATION_ERROR'
        );
      }
    }

    await Promise.all(
      payload.moves.map(async (move) => {
        const card = cardById.get(move.card_id)!;
        const { error } = await (supabase as any)
          .from('cards')
          .update({
            column_id: move.column_id,
            order_index: move.order_index,
          })
          .eq('id', move.card_id)
          .eq('flow_id', card.flow_id);

        if (error) {
          throw error;
        }
      })
    );

    return sendTaskflowData(res, 200, { updated: payload.moves.length });
  } catch (error) {
    console.error('[TaskFlow][reorderCards]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to reorder cards',
      'INTERNAL_ERROR'
    );
  }
}

export async function deleteCard(req: AuthRequest, res: Response) {
  const cardId = req.params.cardId || req.params.id;

  if (!isValidUuid(cardId)) {
    return sendTaskflowError(
      res,
      400,
      'cardId must be a valid UUID',
      'VALIDATION_ERROR'
    );
  }

  const context = await resolveControllerContext(req, res);

  if (!context) {
    return;
  }

  try {
    const existingCard = await fetchOwnedCard(cardId, context.userId);

    if (!existingCard) {
      return sendTaskflowError(res, 404, 'Card not found', 'NOT_FOUND');
    }

    const { error } = await (supabase as any)
      .from('cards')
      .delete()
      .eq('id', existingCard.id)
      .eq('flow_id', existingCard.flow_id);

    if (error) {
      throw error;
    }

    return res.status(204).send();
  } catch (error) {
    console.error('[TaskFlow][deleteCard]', error);
    return sendTaskflowError(
      res,
      500,
      'Failed to delete card',
      'INTERNAL_ERROR'
    );
  }
}

export const cardController = {
  listCards,
  getCard,
  createCard,
  updateCard,
  reorderCards,
  deleteCard,
};
