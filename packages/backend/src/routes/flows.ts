import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber, asOptionalString } from '../utils/http';
import { AppError } from '../utils/errors';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/request-user';

const router = Router();

type OperationalStatus = 'active' | 'completed' | 'blocked';

interface IndicatorPayload {
  activeCards: number;
  completedCards: number;
  blockedCards: number;
  throughput: number;
}

interface CardAggregation {
  flowId: number;
  status: OperationalStatus;
  updatedAt: string;
}

interface FlowCardPayload {
  id: number;
  title: string;
  description: string | null;
  status: OperationalStatus;
  rawStatus: string | null;
  responsible: string | null;
  progress: {
    total: number;
    completed: number;
    percent: number;
  };
  tasksSummary: {
    open: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
  tags: Array<{ id: number; name: string; color: string }>;
  contacts: unknown[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function resolveOperationalStatus(
  rawStatus: string | null | undefined,
  columnName: string | null | undefined
): OperationalStatus {
  const normalizedStatus = normalizeText(rawStatus);
  const normalizedColumn = normalizeText(columnName);

  if (
    normalizedStatus === 'blocked' ||
    normalizedStatus === 'bloqueado' ||
    normalizedStatus === 'paused' ||
    normalizedStatus === 'cancelled' ||
    normalizedStatus === 'canceled'
  ) {
    return 'blocked';
  }

  if (
    normalizedStatus === 'completed' ||
    normalizedStatus === 'done' ||
    normalizedStatus === 'concluido' ||
    normalizedStatus === 'concluído' ||
    normalizedStatus === 'finalizado'
  ) {
    return 'completed';
  }

  if (
    normalizedColumn.includes('final') ||
    normalizedColumn.includes('done') ||
    normalizedColumn.includes('conclu') ||
    normalizedColumn.includes('fechado')
  ) {
    return 'completed';
  }

  return 'active';
}

function buildIndicators(cards: CardAggregation[]): IndicatorPayload {
  const now = Date.now();
  const throughputThreshold = now - 7 * 24 * 60 * 60 * 1000;

  return cards.reduce(
    (acc, card) => {
      if (card.status === 'completed') {
        acc.completedCards += 1;
        const updatedAt = new Date(card.updatedAt).getTime();
        if (!Number.isNaN(updatedAt) && updatedAt >= throughputThreshold) {
          acc.throughput += 1;
        }
      } else if (card.status === 'blocked') {
        acc.blockedCards += 1;
      } else {
        acc.activeCards += 1;
      }

      return acc;
    },
    {
      activeCards: 0,
      completedCards: 0,
      blockedCards: 0,
      throughput: 0,
    }
  );
}

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

// GET /api/flows - List user flows with indicators
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const { data: flows, error: flowsError } = await supabase
      .from('flows')
      .select('id,name,user_id,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (flowsError) {
      throw flowsError;
    }

    const flowRows = flows || [];

    if (flowRows.length === 0) {
      res.status(200).json([]);
      return;
    }

    const flowIds = flowRows.map((flow) => flow.id);

    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('id,flow_id,name,order')
      .in('flow_id', flowIds);

    if (columnsError) {
      throw columnsError;
    }

    const columnRows = columns || [];
    const columnIds = columnRows.map((column) => column.id);
    const columnToFlow = new Map<number, number>();
    const columnNameById = new Map<number, string>();

    columnRows.forEach((column) => {
      columnToFlow.set(Number(column.id), Number(column.flow_id));
      columnNameById.set(Number(column.id), column.name);
    });

    let cardRows: Array<{
      id: number;
      column_id: number;
      status: string | null;
      updated_at: string;
    }> = [];

    if (columnIds.length > 0) {
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('id,column_id,status,updated_at')
        .in('column_id', columnIds)
        .eq('user_id', userId);

      if (cardsError) {
        throw cardsError;
      }

      cardRows = cards || [];
    }

    const columnsCountByFlow = new Map<number, number>();
    columnRows.forEach((column) => {
      const flowId = Number(column.flow_id);
      columnsCountByFlow.set(flowId, (columnsCountByFlow.get(flowId) || 0) + 1);
    });

    const cardsByFlow = new Map<number, CardAggregation[]>();
    cardRows.forEach((card) => {
      const columnId = Number(card.column_id);
      const flowId = columnToFlow.get(columnId);
      if (!flowId) {
        return;
      }

      const status = resolveOperationalStatus(card.status, columnNameById.get(columnId));
      const cards = cardsByFlow.get(flowId) || [];
      cards.push({
        flowId,
        status,
        updatedAt: card.updated_at,
      });
      cardsByFlow.set(flowId, cards);
    });

    res.status(200).json(
      flowRows.map((flow) => {
        const flowId = Number(flow.id);
        const cards = cardsByFlow.get(flowId) || [];
        return {
          id: flowId,
          name: flow.name,
          userId: flow.user_id,
          createdAt: flow.created_at,
          updatedAt: flow.updated_at,
          columnsCount: columnsCountByFlow.get(flowId) || 0,
          cardsCount: cards.length,
          indicators: buildIndicators(cards),
        };
      })
    );
  } catch (error) {
    next(error);
  }
});

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
    const columnNameById = new Map<number, string>();
    (columns || []).forEach((column) => {
      columnNameById.set(Number(column.id), column.name);
    });

    let cardsByColumnId: Record<number, FlowCardPayload[]> = {};
    let allCardsForIndicators: CardAggregation[] = [];

    if (columnIds.length > 0) {
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('id,title,description,column_id,user_id,created_at,updated_at,status,contacts,custom_fields')
        .in('column_id', columnIds)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (cardsError) {
        throw cardsError;
      }

      const cardRows = cards || [];
      const cardIds = cardRows.map((card) => card.id);

      let tasksByCardId = new Map<number, Array<{
        id: number;
        card_id: number;
        status: string;
        assigned_to: string | null;
      }>>();

      if (cardIds.length > 0) {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id,card_id,status,assigned_to')
          .in('card_id', cardIds);

        if (tasksError) {
          throw tasksError;
        }

        tasksByCardId = (tasks || []).reduce((acc, task) => {
          const cardId = Number(task.card_id);
          const existing = acc.get(cardId) || [];
          existing.push({
            id: Number(task.id),
            card_id: cardId,
            status: String(task.status || 'open'),
            assigned_to: task.assigned_to,
          });
          acc.set(cardId, existing);
          return acc;
        }, new Map<number, Array<{
          id: number;
          card_id: number;
          status: string;
          assigned_to: string | null;
        }>>());
      }

      let tagsByCardId = new Map<number, Array<{ id: number; name: string; color: string }>>();

      if (cardIds.length > 0) {
        const { data: cardTags, error: cardTagsError } = await supabase
          .from('card_tags')
          .select('card_id,tags(id,name,color)')
          .in('card_id', cardIds);

        if (cardTagsError) {
          throw cardTagsError;
        }

        tagsByCardId = (cardTags || []).reduce((acc, relation: any) => {
          const cardId = Number(relation.card_id);
          const existing = acc.get(cardId) || [];
          const tag = relation.tags;

          if (tag && tag.id) {
            existing.push({
              id: Number(tag.id),
              name: tag.name,
              color: tag.color,
            });
          }

          acc.set(cardId, existing);
          return acc;
        }, new Map<number, Array<{ id: number; name: string; color: string }>>());
      }

      cardsByColumnId = cardRows.reduce((acc, card) => {
        const columnId = Number(card.column_id);
        const tasks = tasksByCardId.get(Number(card.id)) || [];
        const completedTasks = tasks.filter((task) => normalizeText(task.status) === 'completed').length;
        const operationalStatus = resolveOperationalStatus(card.status, columnNameById.get(columnId));
        const totalTasks = tasks.length;
        const progressPercent =
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : operationalStatus === 'completed'
            ? 100
            : 0;

        const responsibleTask = tasks.find((task) => normalizeText(task.assigned_to));
        const responsible = responsibleTask?.assigned_to?.trim() || null;

        const taskSummary = tasks.reduce(
          (summary, task) => {
            const taskStatus = normalizeText(task.status);
            if (taskStatus === 'completed') {
              summary.completed += 1;
            } else if (taskStatus === 'in_progress' || taskStatus === 'in progress') {
              summary.inProgress += 1;
            } else if (taskStatus === 'blocked') {
              summary.blocked += 1;
            } else {
              summary.open += 1;
            }
            return summary;
          },
          { open: 0, inProgress: 0, completed: 0, blocked: 0 }
        );

        if (!acc[columnId]) {
          acc[columnId] = [];
        }

        const mappedCard = {
          id: card.id,
          title: card.title,
          description: card.description,
          status: operationalStatus,
          rawStatus: card.status || null,
          responsible,
          progress: {
            total: totalTasks,
            completed: completedTasks,
            percent: progressPercent,
          },
          tasksSummary: taskSummary,
          tags: tagsByCardId.get(Number(card.id)) || [],
          contacts: Array.isArray(card.contacts) ? card.contacts : [],
          customFields:
            card.custom_fields && typeof card.custom_fields === 'object'
              ? card.custom_fields
              : {},
          createdAt: card.created_at,
          updatedAt: card.updated_at,
        };

        acc[columnId].push(mappedCard);
        allCardsForIndicators.push({
          flowId,
          status: operationalStatus,
          updatedAt: card.updated_at,
        });

        return acc;
      }, {} as Record<number, FlowCardPayload[]>);
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
      indicators: buildIndicators(allCardsForIndicators),
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
