import { Activity, ListTodo, Sparkles, SquareKanban, CalendarClock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CalendarPanel, { CalendarEvent } from '../components/panel/CalendarPanel';
import TasksPanel, { PanelTask, TaskTag } from '../components/panel/TasksPanel';
import { Badge } from '../components/ui/Badge';
import { ProgressSegments, type ProgressSegmentColor } from '../components/ui/ProgressSegments';
import { eventsService } from '../services/events.service';
import { apiClient } from '../services/api.client';

interface ApiTaskItem {
  id: number;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  card_id: number;
}

interface ApiTasksResponse {
  items?: ApiTaskItem[];
}

interface ApiCardDetail {
  id: number;
  title?: string;
  progress?: {
    percent?: number;
  };
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

interface ApiEventItem {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  card_id: number | null;
  task_id: number | null;
}

interface ApiEventsResponse {
  items?: ApiEventItem[];
}

interface ApiPanelResponse {
  summary?: {
    flowsCount?: number;
    cardsCount?: number;
    openTasksCount?: number;
    dueTodayTasksCount?: number;
  };
}

interface SummaryState {
  flowsCount: number;
  cardsCount: number;
  openTasksCount: number;
  dueTodayTasksCount: number;
}

const fallbackTasks: PanelTask[] = [
  {
    id: 101,
    title: 'Revisar estratégia e copy do projeto',
    priority: 'P1',
    status: 'in_progress',
    dueDate: new Date().toISOString(),
    assignedTo: 'Lucas Boniatti',
    cardId: 44,
    cardName: 'Agrocenter Solar',
    progress: 64,
    tags: [
      { id: 1, name: 'ONBOARDING', color: '#6d28d9' },
      { id: 2, name: 'ALTA PRIORIDADE', color: '#dc2626' },
    ],
  },
  {
    id: 102,
    title: 'Coletar aprovação da SDR IA',
    priority: 'P2',
    status: 'todo',
    dueDate: null,
    assignedTo: 'Time Comercial',
    cardId: 45,
    cardName: 'Digital Rockets',
    progress: 25,
    tags: [{ id: 3, name: 'FLOW PLUS IA', color: '#059669' }],
  },
  {
    id: 103,
    title: 'Fechamento mensal operação DR',
    priority: 'P3',
    status: 'completed',
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    assignedTo: 'Operações',
    cardId: 46,
    cardName: 'Gestão Operação DR',
    progress: 100,
    tags: [{ id: 4, name: 'OPERAÇÃO', color: '#2563eb' }],
  },
];

const fallbackEvents: CalendarEvent[] = [
  {
    id: 'evt-local-1',
    title: 'Reunião de alinhamento de fluxos',
    startsAt: new Date().toISOString(),
    endsAt: null,
    cardId: 44,
    taskId: 101,
  },
  {
    id: 'evt-local-2',
    title: 'Entrega de assets para jurídico',
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: null,
    cardId: 45,
    taskId: 102,
  },
];

const fallbackSummary: SummaryState = {
  flowsCount: 6,
  cardsCount: 28,
  openTasksCount: 19,
  dueTodayTasksCount: 5,
};

function inferProgress(status: string): number {
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 65;
  if (status === 'todo') return 30;
  return 15;
}

function toCalendarIso(value: string): string {
  if (value.includes('T')) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function getLocalDevToken(): string {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('devToken');
  const tokenFromStorage = window.localStorage.getItem('tasksflow_dev_token');
  const token = tokenFromUrl || tokenFromStorage || '';

  if (tokenFromUrl) {
    window.localStorage.setItem('tasksflow_dev_token', tokenFromUrl);
  }

  return token;
}

export default function HomePage() {
  const router = useRouter();

  const [devToken, setDevToken] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [todayLabel, setTodayLabel] = useState('Hoje');

  const [summary, setSummary] = useState<SummaryState>(fallbackSummary);

  const [tasks, setTasks] = useState<PanelTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [tasksHint, setTasksHint] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsMutating, setEventsMutating] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsHint, setEventsHint] = useState<string | null>(null);

  const querySearch = useMemo(() => {
    if (typeof router.query.q !== 'string') return '';
    return router.query.q.trim().toLowerCase();
  }, [router.query.q]);

  const queryPriority = useMemo(() => {
    if (typeof router.query.priority !== 'string') return 'all';
    return router.query.priority;
  }, [router.query.priority]);

  useEffect(() => {
    setDevToken(getLocalDevToken());
  }, []);

  useEffect(() => {
    setTodayLabel(
      new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).format(new Date())
    );
  }, []);

  const loadData = useCallback(async () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (devToken) {
      headers.Authorization = `Bearer ${devToken}`;
    }

    setTasksLoading(true);
    setEventsLoading(true);
    setTasksError(null);
    setEventsError(null);
    setTasksHint(null);
    setEventsHint(null);

    try {
      const [tasksResult, eventsResult, panelResult] = await Promise.allSettled([
        apiClient.get<ApiTasksResponse>('/api/tasks?limit=12&offset=0'),
        apiClient.get<ApiEventsResponse>('/api/events?limit=8&offset=0'),
        apiClient.get<ApiPanelResponse>('/api/panel/overview?limit=6'),
      ]);

      if (panelResult.status === 'fulfilled') {
        const payload = panelResult.value.data;
        const summaryPayload = payload?.summary;

        if (summaryPayload) {
          setSummary({
            flowsCount: summaryPayload.flowsCount || 0,
            cardsCount: summaryPayload.cardsCount || 0,
            openTasksCount: summaryPayload.openTasksCount || 0,
            dueTodayTasksCount: summaryPayload.dueTodayTasksCount || 0,
          });
        } else {
          setSummary(fallbackSummary);
        }
      } else {
        setSummary(fallbackSummary);
      }

      if (tasksResult.status === 'fulfilled') {
        const payload = tasksResult.value.data;
        const rawTasks = Array.isArray(payload?.items) ? payload.items : [];

        const cardIds = [...new Set(rawTasks.map((task) => task.card_id).filter(Boolean))];

        const cardData = new Map<number, { title: string; progress: number; tags: TaskTag[] }>();

        const cardDetails = await Promise.allSettled(
          cardIds.map(async (cardId) => {
            try {
              const cardResponse = await apiClient.get<ApiCardDetail>(`/api/cards/${cardId}`);
              return { cardId, cardPayload: cardResponse.data };
            } catch {
              return null;
            }
          })
        );

        cardDetails.forEach((result) => {
          if (result.status !== 'fulfilled' || result.value === null) {
            return;
          }

          const { cardId, cardPayload } = result.value;

          cardData.set(cardId, {
            title: cardPayload.title || `Card #${cardId}`,
            progress: cardPayload.progress?.percent || 0,
            tags: Array.isArray(cardPayload.tags)
              ? cardPayload.tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color,
              }))
              : [],
          });
        });

        const mappedTasks: PanelTask[] = rawTasks.map((task) => {
          const card = cardData.get(task.card_id);

          return {
            id: task.id,
            title: task.title,
            priority: task.priority || 'P3',
            status: task.status || 'open',
            dueDate: task.due_date,
            assignedTo: task.assigned_to,
            cardId: task.card_id,
            cardName: card?.title || `Card #${task.card_id}`,
            progress: card?.progress || inferProgress(task.status || 'open'),
            tags: card?.tags || [],
          };
        });

        setTasks(mappedTasks);
        setTasksHint(
          mappedTasks.length === 0
            ? 'Sem tarefas cadastradas para este usuário.'
            : null
        );
      } else {
        setTasks([]);
        setTasksError('Falha de rede ao carregar tarefas.');
      }

      if (eventsResult.status === 'fulfilled') {
        const payload = eventsResult.value.data;
        const rawEvents = Array.isArray(payload?.items) ? payload.items : [];

        const mappedEvents: CalendarEvent[] = rawEvents.map((event) => ({
          id: event.id,
          title: event.title,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          cardId: event.card_id,
          taskId: event.task_id,
        }));

        setEvents(mappedEvents);
        setEventsHint(
          mappedEvents.length === 0
            ? 'Nenhum evento programado para o período atual.'
            : null
        );
      } else {
        setEvents([]);
        setEventsError('Falha de rede ao carregar calendário.');
      }

    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro inesperado ao carregar painel.';

      setSummary(fallbackSummary);
      setTasks([]);
      setEvents([]);
      setTasksHint(null);
      setEventsHint(null);
      setTasksError(`Erro inesperado ao carregar tarefas: ${message}`);
      setEventsError(`Erro inesperado ao carregar calendário: ${message}`);
    } finally {
      setTasksLoading(false);
      setEventsLoading(false);
    }
  }, [devToken]);

  useEffect(() => {
    void loadData();
  }, [loadData, reloadCount]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (queryPriority !== 'all' && task.priority !== queryPriority) {
        return false;
      }

      if (!querySearch) {
        return true;
      }

      const haystack = [
        task.title,
        task.cardName,
        task.assignedTo || '',
        task.tags.map((tag) => tag.name).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(querySearch);
    });
  }, [tasks, queryPriority, querySearch]);

  const undatedTasksCount = useMemo(
    () => filteredTasks.filter((task) => !task.dueDate).length,
    [filteredTasks]
  );

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const dueDateSyntheticEvents: CalendarEvent[] = filteredTasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `task-due-${task.id}`,
        title: `Prazo: ${task.title}`,
        startsAt: toCalendarIso(task.dueDate as string),
        endsAt: null,
        cardId: task.cardId,
        taskId: task.id,
      }));

    const merged = [...events];

    dueDateSyntheticEvents.forEach((dueEvent) => {
      const alreadyExists = merged.some(
        (existing) => existing.taskId === dueEvent.taskId && existing.id.startsWith('task-due-')
      );
      if (!alreadyExists) {
        merged.push(dueEvent);
      }
    });

    return merged;
  }, [events, filteredTasks]);

  const completedTasks = useMemo(
    () => filteredTasks.filter((task) => task.status === 'completed').length,
    [filteredTasks]
  );
  const completionRate = filteredTasks.length > 0 ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;
  const operationalFocus =
    summary.dueTodayTasksCount > 0
      ? `${summary.dueTodayTasksCount} itens vencem hoje e merecem prioridade imediata.`
      : 'Sem vencimentos urgentes no momento; bom espaço para evoluir tarefas estruturais.';

  const handleCreateEvent = useCallback(
    async (payload: {
      title: string;
      description: string | null;
      startsAt: string;
      endsAt: string | null;
      cardId: number | null;
      taskId: number | null;
    }) => {
      if (!devToken) {
        setEventsError('Sua sessão precisa ser reconhecida para criar um evento real.');
        return;
      }

      setEventsMutating(true);
      setEventsError(null);

      try {
        await eventsService.create(devToken, payload);
        setReloadCount((previous) => previous + 1);
      } catch (eventError) {
        setEventsError(
          eventError instanceof Error
            ? eventError.message
            : 'Falha ao criar evento.'
        );
      } finally {
        setEventsMutating(false);
      }
    },
    [devToken]
  );

  const handleUpdateEvent = useCallback(
    async (
      eventId: string,
      payload: {
        title?: string;
        description?: string | null;
        startsAt?: string;
        endsAt?: string | null;
        cardId?: number | null;
        taskId?: number | null;
      }
    ) => {
      if (!devToken) {
        setEventsError('Sua sessão precisa ser reconhecida para editar um evento real.');
        return;
      }

      setEventsMutating(true);
      setEventsError(null);

      try {
        await eventsService.update(eventId, devToken, payload);
        setReloadCount((previous) => previous + 1);
      } catch (eventError) {
        setEventsError(
          eventError instanceof Error
            ? eventError.message
            : 'Falha ao editar evento.'
        );
      } finally {
        setEventsMutating(false);
      }
    },
    [devToken]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!devToken) {
        setEventsError('Sua sessão precisa ser reconhecida para remover um evento real.');
        return;
      }

      setEventsMutating(true);
      setEventsError(null);

      try {
        await eventsService.remove(eventId, devToken);
        setReloadCount((previous) => previous + 1);
      } catch (eventError) {
        setEventsError(
          eventError instanceof Error
            ? eventError.message
            : 'Falha ao remover evento.'
        );
      } finally {
        setEventsMutating(false);
      }
    },
    [devToken]
  );

  const summaryCards: Array<{
    label: string;
    value: number;
    icon: typeof SquareKanban;
    color: string;
    progressColor: ProgressSegmentColor;
    note: string;
  }> = [
    {
      label: 'Fluxos ativos',
      value: summary.flowsCount,
      icon: SquareKanban,
      color: 'bg-primary-50 text-primary-700 border-primary-100',
      progressColor: 'primary',
      note: 'visão em andamento',
    },
    {
      label: 'Cards em operação',
      value: summary.cardsCount,
      icon: ShieldCheck,
      color: 'bg-success-50 text-success-700 border-success-100',
      progressColor: 'success',
      note: 'pipeline ativo',
    },
    {
      label: 'Tarefas abertas',
      value: summary.openTasksCount,
      icon: ListTodo,
      color: 'bg-warning-50 text-warning-700 border-warning-100',
      progressColor: 'warning',
      note: 'trabalho pendente',
    },
    {
      label: 'Vencendo hoje',
      value: summary.dueTodayTasksCount,
      icon: CalendarClock,
      color: 'bg-error-50 text-error-700 border-error-100',
      progressColor: 'error',
      note: 'atenção imediata',
    },
  ];

  const activeFilters = [
    querySearch ? `Busca: ${querySearch}` : null,
    queryPriority !== 'all' ? `Prioridade: ${queryPriority}` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="space-y-5">
      <section className="app-surface overflow-hidden p-4 sm:p-5 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)]">
          <div className="max-w-3xl">
            <p className="app-kicker">Painel operacional</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[1.85rem] font-bold tracking-[-0.03em] text-[color:var(--text-strong)] sm:text-3xl">
                Painel Consolidado de Operações
              </h1>
              <Badge tone="info">{todayLabel}</Badge>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">
              Acompanhe o que vence hoje, o pulso do pipeline e a agenda operacional em uma única leitura. Use os filtros da topbar para refinar prioridades sem perder o contexto do dia.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.length > 0 ? (
                activeFilters.map((filter) => (
                  <Badge key={filter} tone="neutral" className="normal-case tracking-normal">
                    {filter}
                  </Badge>
                ))
              ) : (
                <Badge tone="neutral" className="hidden normal-case tracking-normal sm:inline-flex">
                  Sem filtros adicionais ativos
                </Badge>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="app-note-card flex gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                <div>
                  <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                    Foco do dia
                  </h3>
                  <p className="text-sm text-[color:var(--text-secondary)]">{operationalFocus}</p>
                </div>
              </div>
              <div className="app-note-card flex gap-3">
                <Activity className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                <div>
                  <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                    Cadência atual
                  </h3>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    {completionRate}% das tarefas filtradas já foram concluídas e {calendarEvents.length} eventos sustentam a agenda ativa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="app-note-card">
              <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                <span>Ritmo da operação</span>
                <span>{completionRate}%</span>
              </div>
              <ProgressSegments
                filled={
                  completionRate >= 75 ? 4 : completionRate >= 50 ? 3 : completionRate >= 25 ? 2 : 1
                }
                total={4}
                color={completionRate >= 75 ? 'success' : completionRate >= 50 ? 'primary' : 'warning'}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={summary.dueTodayTasksCount > 0 ? 'warning' : 'success'}>
                  {summary.dueTodayTasksCount} vencem hoje
                </Badge>
                <Badge tone="info">{summary.openTasksCount} abertas</Badge>
                <Badge tone="neutral">{events.length} eventos reais</Badge>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-3.5 shadow-[var(--shadow-soft)] sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${card.color} sm:h-10 sm:w-10`}>
                        <Icon size={17} />
                      </div>
                    </div>
                    <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)] sm:mt-4 sm:text-[10px]">
                      {card.label}
                    </p>
                    <p className="mt-2 text-[1.75rem] font-extrabold leading-none tracking-[-0.04em] text-[color:var(--text-strong)] sm:mt-3 sm:text-3xl">
                      {card.value}
                    </p>
                    <div className="mt-2 sm:mt-3">
                      <ProgressSegments
                        filled={card.value > 0 ? 4 : 1}
                        total={4}
                        color={card.progressColor}
                      />
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-[color:var(--text-secondary)] sm:mt-3 sm:text-xs">{card.note}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.45fr_0.95fr]">
        <TasksPanel
          tasks={filteredTasks}
          loading={tasksLoading}
          error={tasksError}
          sourceHint={tasksHint}
          onRetry={() => setReloadCount((previous) => previous + 1)}
        />

        <CalendarPanel
          events={calendarEvents}
          loading={eventsLoading || eventsMutating}
          error={eventsError}
          sourceHint={eventsHint}
          canEdit={Boolean(devToken)}
          undatedTasksCount={undatedTasksCount}
          onCreateEvent={handleCreateEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onRetry={() => setReloadCount((previous) => previous + 1)}
        />
      </section>
    </div>
  );
}
