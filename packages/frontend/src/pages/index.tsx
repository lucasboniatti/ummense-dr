import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CircleAlert,
  ListTodo,
  ShieldCheck,
  Sparkles,
  SquareKanban,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CalendarPanel, { CalendarEvent } from '../components/panel/CalendarPanel';
import TasksPanel, { PanelTask, TaskTag } from '../components/panel/TasksPanel';
import { AvatarStack } from '../components/ui/AvatarStack';
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

const emptySummary: SummaryState = {
  flowsCount: 0,
  cardsCount: 0,
  openTasksCount: 0,
  dueTodayTasksCount: 0,
};

function inferProgress(status: string): number {
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 65;
  if (status === 'todo') return 30;
  return 15;
}

function priorityRank(priority: string): number {
  if (priority === 'P1') return 0;
  if (priority === 'P2') return 1;
  if (priority === 'P3') return 2;
  return 3;
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

function formatDueDate(value: string | null): string {
  if (!value) {
    return 'Sem prazo';
  }

  const parsed = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
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

  const [summary, setSummary] = useState<SummaryState>(emptySummary);

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
          setSummary(emptySummary);
        }
      } else {
        setSummary(emptySummary);
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

      setSummary(emptySummary);
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
  const spotlightTasks = useMemo(() => {
    return [...filteredTasks]
      .sort((left, right) => {
        const leftPriority = priorityRank(left.priority);
        const rightPriority = priorityRank(right.priority);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        if (left.dueDate && right.dueDate) {
          return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
        }

        if (left.dueDate) return -1;
        if (right.dueDate) return 1;

        return left.title.localeCompare(right.title);
      })
      .slice(0, 3);
  }, [filteredTasks]);
  const liveEventsCount = calendarEvents.length;
  const cadenceTone: ProgressSegmentColor =
    completionRate >= 75 ? 'success' : completionRate >= 45 ? 'primary' : 'warning';
  const cadenceSegments =
    completionRate >= 75 ? 4 : completionRate >= 50 ? 3 : completionRate >= 25 ? 2 : completionRate > 0 ? 1 : 0;
  const operationalFocus =
    summary.dueTodayTasksCount > 0
      ? `${summary.dueTodayTasksCount} itens vencem hoje e merecem prioridade imediata.`
      : 'Sem vencimentos urgentes no momento. Use a janela do dia para avançar cards e rotinas estruturais.';

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
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.22fr)_minmax(20rem,0.78fr)]">
        <div className="app-surface overflow-hidden p-5 sm:p-6 md:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="app-kicker">Operação em foco</p>
                <Badge tone={summary.dueTodayTasksCount > 0 ? 'warning' : 'info'}>{todayLabel}</Badge>
              </div>

              <div className="space-y-3">
                <h1 className="font-display max-w-4xl text-[2.2rem] font-bold leading-[1.02] tracking-[-0.045em] text-[color:var(--text-strong)] sm:text-[2.65rem]">
                  Painel Consolidado de Operações
                </h1>
                <p className="max-w-3xl text-[15px] leading-7 text-[color:var(--text-secondary)]">
                  Centralize a leitura do dia em uma única superfície: o que precisa de atenção,
                  a cadência real das entregas e a agenda que sustenta a operação comercial.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeFilters.length > 0 ? (
                  activeFilters.map((filter) => (
                    <Badge key={filter} tone="neutral" className="normal-case tracking-normal">
                      {filter}
                    </Badge>
                  ))
                ) : (
                  <Badge tone="neutral" className="normal-case tracking-normal">
                    Vista base ativa
                  </Badge>
                )}
                <Badge tone="info" className="normal-case tracking-normal">
                  {liveEventsCount} eventos na agenda
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
              <article className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Foco do dia
                    </p>
                    <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">
                      Prioridades imediatas
                    </h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-700">
                    <Sparkles size={18} />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[color:var(--text-secondary)]">
                  {operationalFocus}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Janela do dia
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                      {summary.dueTodayTasksCount}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                      tarefas vencendo hoje
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Execução
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                      {summary.openTasksCount}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                      tarefas abertas
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Agenda
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                      {liveEventsCount}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                      marcos visíveis na vista
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Cadência operacional
                    </p>
                    <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">
                      Snapshot do dia
                    </h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-success-100 bg-success-50 text-success-700">
                    <Activity size={18} />
                  </div>
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <p className="text-4xl font-extrabold tracking-[-0.05em] text-[color:var(--text-strong)]">
                    {completionRate}%
                  </p>
                  <p className="pb-1 text-sm font-medium text-[color:var(--text-secondary)]">
                    conclusão do recorte atual
                  </p>
                </div>
                <div className="mt-4">
                  <ProgressSegments filled={cadenceSegments} total={4} color={cadenceTone} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={summary.dueTodayTasksCount > 0 ? 'warning' : 'success'}>
                    {summary.dueTodayTasksCount > 0 ? 'atenção hoje' : 'janela controlada'}
                  </Badge>
                  <Badge tone="info">{completedTasks} concluídas</Badge>
                  <Badge tone="neutral">{undatedTasksCount} sem prazo</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-[color:var(--text-secondary)]">
                  {completionRate > 0
                    ? `${completionRate}% das tarefas filtradas já avançaram nesta janela.`
                    : 'Sem progresso contabilizado neste recorte. Use a vista para decidir o próximo movimento.'}
                </p>
              </article>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-accent)] hover:shadow-[var(--shadow-primary-day)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                          {card.label}
                        </p>
                        <p className="mt-3 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-[color:var(--text-strong)]">
                          {card.value}
                        </p>
                      </div>
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.color}`}>
                        <Icon size={18} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <ProgressSegments filled={card.value > 0 ? 4 : 0} total={4} color={card.progressColor} />
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--text-secondary)]">{card.note}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  Prioridades imediatas
                </p>
                <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">
                  O que merece atenção agora
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-warning-100 bg-warning-50 text-warning-700">
                <CircleAlert size={18} />
              </div>
            </div>

            {spotlightTasks.length > 0 ? (
              <div className="mt-5 space-y-3">
                {spotlightTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--text-strong)]">
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                          {task.cardName}
                        </p>
                      </div>
                      <Badge tone={task.priority === 'P1' ? 'error' : task.priority === 'P2' ? 'warning' : 'info'}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <ProgressSegments
                        filled={
                          task.progress >= 100 ? 4 : task.progress >= 60 ? 3 : task.progress >= 30 ? 2 : task.progress > 0 ? 1 : 0
                        }
                        total={4}
                        color={task.status === 'completed' ? 'success' : task.priority === 'P1' ? 'warning' : 'primary'}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <AvatarStack
                        avatars={[{ fallback: task.assignedTo ? task.assignedTo.slice(0, 2) : 'ND' }]}
                        size="sm"
                        max={1}
                      />
                      <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                        <span>{task.dueDate ? formatDueDate(task.dueDate) : 'Sem prazo'}</span>
                        <ArrowUpRight size={13} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-4">
                <p className="text-sm font-medium text-[color:var(--text-strong)]">Nenhuma prioridade aberta nesta vista</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                  Quando novas tarefas entrarem na janela operacional, esta coluna destaca o que precisa de resposta imediata.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-[var(--radius-xl)] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              Leitura de contexto
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">
              Base da operação
            </h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  Vista ativa
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                  {activeFilters.length > 0
                    ? activeFilters.join(' · ')
                    : 'Sem filtros adicionais aplicados. A home reflete o panorama completo da conta.'}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  Próximo passo
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                  Use tarefas para puxar execução imediata e agenda para distribuir marcos sem perder o ritmo do pipeline.
                </p>
              </div>
            </div>
          </section>
        </aside>
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
