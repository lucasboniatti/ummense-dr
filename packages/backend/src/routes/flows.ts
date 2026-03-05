import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber, asOptionalString, asString } from '../utils/http';
import { AppError } from '../utils/errors';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/request-user';

const router = Router();

async function ensureFlowOwnership(flowId: number, userId: string) {
  const { data: flow, error } = await supabase
    .from('flows')
    .select('id,name,user_id,created_at,updated_at')
    .eq('id', flowId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!flow) {
    throw new AppError('Flow not found', 404);
  }

  return flow;
}

// POST /api/flows - Create flow + default columns
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const name = asOptionalString(req.body?.name);

    if (!name) {
      throw new AppError('Flow name is required', 400);
    }

    const { data: createdFlow, error: flowError } = await supabase
      .from('flows')
      .insert({
        name,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id,name,user_id,created_at,updated_at')
      .single();

    if (flowError) {
      throw flowError;
    }

    const defaultColumns = ['Backlog', 'A Fazer', 'Em Progresso', 'Finalizado'];
    const { error: columnsError } = await supabase.from('columns').insert(
      defaultColumns.map((columnName, index) => ({
        name: columnName,
        order: index,
        flow_id: createdFlow.id,
        created_at: new Date().toISOString(),
      }))
    );

    if (columnsError) {
      throw columnsError;
    }

    res.status(201).json({
      id: createdFlow.id,
      name: createdFlow.name,
      userId: createdFlow.user_id,
      createdAt: createdFlow.created_at,
      updatedAt: createdFlow.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/flows/:id - Get flow with columns and cards
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const flowId = asNumber(req.params.id, 0);

    if (!flowId) {
      throw new AppError('Invalid flow id', 400);
    }

    const flow = await ensureFlowOwnership(flowId, userId);

    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('id,name,order,flow_id,created_at')
      .eq('flow_id', flowId)
      .order('order', { ascending: true });

    if (columnsError) {
      throw columnsError;
    }

    const columnIds = (columns || []).map((column) => column.id);

    let cardsByColumnId: Record<number, any[]> = {};

    if (columnIds.length > 0) {
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('id,title,description,column_id,user_id,created_at,updated_at,status')
        .in('column_id', columnIds)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (cardsError) {
        throw cardsError;
      }

      cardsByColumnId = (cards || []).reduce((acc, card) => {
        const columnId = Number(card.column_id);
        if (!acc[columnId]) {
          acc[columnId] = [];
        }

        acc[columnId].push({
          id: card.id,
          title: card.title,
          description: card.description,
          status: card.status || 'active',
          createdAt: card.created_at,
          updatedAt: card.updated_at,
        });

        return acc;
      }, {} as Record<number, any[]>);
    }

    res.status(200).json({
      id: flow.id,
      name: flow.name,
      userId: flow.user_id,
      createdAt: flow.created_at,
      updatedAt: flow.updated_at,
      columns: (columns || []).map((column) => ({
        id: column.id,
        name: column.name,
        order: column.order,
        cards: cardsByColumnId[column.id] || [],
      })),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/flows/:id/columns - Update column name
router.put('/:id/columns', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const flowId = asNumber(req.params.id, 0);
    const columnId = asNumber(req.body?.columnId, 0);
    const name = asOptionalString(req.body?.name);

    if (!flowId || !columnId || !name) {
      throw new AppError('flow id, columnId and name are required', 400);
    }

    await ensureFlowOwnership(flowId, userId);

    const { data: column, error } = await supabase
      .from('columns')
      .update({ name })
      .eq('id', columnId)
      .eq('flow_id', flowId)
      .select('id,name,order,flow_id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!column) {
      throw new AppError('Column not found', 404);
    }

    res.status(200).json({
      id: column.id,
      name: column.name,
      order: column.order,
      flowId: column.flow_id,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/flows/:id/columns - Add column
router.post('/:id/columns', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const flowId = asNumber(req.params.id, 0);
    const name = asOptionalString(req.body?.name);

    if (!flowId || !name) {
      throw new AppError('flow id and name are required', 400);
    }

    await ensureFlowOwnership(flowId, userId);

    const { data: lastColumn, error: lastError } = await supabase
      .from('columns')
      .select('order')
      .eq('flow_id', flowId)
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) {
      throw lastError;
    }

    const nextOrder = (lastColumn?.order ?? -1) + 1;

    const { data: column, error } = await supabase
      .from('columns')
      .insert({
        name,
        order: nextOrder,
        flow_id: flowId,
        created_at: new Date().toISOString(),
      })
      .select('id,name,order,flow_id,created_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      id: column.id,
      name: column.name,
      order: column.order,
      flowId: column.flow_id,
      createdAt: column.created_at,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
