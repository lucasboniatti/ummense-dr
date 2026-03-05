import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asNumber } from '../utils/http';
import { supabase } from '../lib/supabase';
import { getAuthenticatedUserId } from '../utils/request-user';

const router = Router();

router.get('/overview', authMiddleware, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const limit = Math.min(asNumber(req.query.limit, 5), 20);

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    const [
      flowsResult,
      cardsResult,
      tasksResult,
      dueTodayResult,
      overdueResult,
      eventsResult,
      recentCardsResult,
    ] = await Promise.all([
      supabase.from('flows').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'todo', 'in_progress']),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('due_date', todayIso),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).lt('due_date', todayIso),
      supabase
        .from('events')
        .select('id,title,starts_at,ends_at,card_id,task_id,metadata')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('starts_at', now.toISOString())
        .order('starts_at', { ascending: true })
        .limit(limit),
      supabase
        .from('cards')
        .select('id,title,updated_at,column_id,status')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit),
    ]);

    const upcomingEvents = (eventsResult.data || []).map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      cardId: event.card_id,
      taskId: event.task_id,
      metadata: event.metadata || {},
    }));

    const recentCards = (recentCardsResult.data || []).map((card) => ({
      id: card.id,
      title: card.title,
      updatedAt: card.updated_at,
      columnId: card.column_id,
      status: card.status || 'active',
    }));

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      summary: {
        flowsCount: flowsResult.count || 0,
        cardsCount: cardsResult.count || 0,
        openTasksCount: tasksResult.count || 0,
        dueTodayTasksCount: dueTodayResult.count || 0,
        overdueTasksCount: overdueResult.count || 0,
      },
      upcomingEvents,
      recentCards,
      pagination: {
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
