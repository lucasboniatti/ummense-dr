import { ListTodo, SquareKanban, CalendarClock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CalendarPanel, { CalendarEvent } from '../components/panel/CalendarPanel';
import TasksPanel, { PanelTask, TaskTag } from '../components/panel/TasksPanel';

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

function getLocalDevToken(): string {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('devToken');
  const tokenFromStorage = window.localStorage.getItem('synkra_dev_token');
  const token = tokenFromUrl || tokenFromStorage || '';

  if (tokenFromUrl) {
    window.localStorage.setItem('synkra_dev_token', tokenFromUrl);
  }

  return token;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    const body = await response.text();
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const router = useRouter();

  const [devToken, setDevToken] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const [summary, setSummary] = useState<SummaryState>(fallbackSummary);

  const [tasks, setTasks] = useState<PanelTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [tasksHint, setTasksHint] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
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
        fetch('/api/tasks?limit=12&offset=0', { headers }),
        fetch('/api/events?limit=8&offset=0', { headers }),
        fetch('/api/panel/overview?limit=6', { headers }),
      ]);

      if (panelResult.status === 'fulfilled') {
        const response = panelResult.value;
        if (response.ok) {
          const payload = await safeJson<ApiPanelResponse>(response);
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
        } else if (response.status === 401 && !devToken) {
          setSummary(fallbackSummary);
        } else {
          setSummary(fallbackSummary);
        }
      } else {
        setSummary(fallbackSummary);
      }

      if (tasksResult.status === 'fulfilled') {
        const response = tasksResult.value;

        if (response.ok) {
          const payload = await safeJson<ApiTasksResponse>(response);
          const rawTasks = Array.isArray(payload?.items) ? payload.items : [];

          const cardIds = [...new Set(rawTasks.map((task) => task.card_id).filter(Boolean))];

          const cardData = new Map<number, { title: string; progress: number; tags: TaskTag[] }>();

          const cardDetails = await Promise.allSettled(
            cardIds.map(async (cardId) => {
              const cardResponse = await fetch(`/api/cards/${cardId}`, { headers });
              if (!cardResponse.ok) return null;

              const cardPayload = await safeJson<ApiCardDetail>(cardResponse);
              if (!cardPayload) return null;

              return { cardId, cardPayload };
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
        } else if (response.status === 401 && !devToken) {
          setTasks(fallbackTasks);
          setTasksHint(
            'Sem token JWT de teste. Exibindo dados locais de fallback no painel.'
          );
        } else {
          const payload = await safeJson<{ error?: string }>(response);
          setTasks([]);
          setTasksError(payload?.error || `Falha HTTP ${response.status} ao carregar tarefas.`);
        }
      } else {
        setTasks([]);
        setTasksError('Falha de rede ao carregar tarefas.');
      }

      if (eventsResult.status === 'fulfilled') {
        const response = eventsResult.value;

        if (response.ok) {
          const payload = await safeJson<ApiEventsResponse>(response);
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
        } else if (response.status === 401 && !devToken) {
          setEvents(fallbackEvents);
          setEventsHint('Sem autenticação ativa. Exibindo agenda local de fallback.');
        } else {
          const payload = await safeJson<{ error?: string }>(response);
          setEvents([]);
          setEventsError(payload?.error || `Falha HTTP ${response.status} ao carregar eventos.`);
        }
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

  const summaryCards = [
    {
      label: 'Fluxos ativos',
      value: summary.flowsCount,
      icon: SquareKanban,
      color: 'bg-primary-50 text-primary-700 border-primary-200',
    },
    {
      label: 'Cards em operação',
      value: summary.cardsCount,
      icon: ShieldCheck,
      color: 'bg-success-50 text-success-700 border-success-200',
    },
    {
      label: 'Tarefas abertas',
      value: summary.openTasksCount,
      icon: ListTodo,
      color: 'bg-warning-50 text-warning-700 border-warning-200',
    },
    {
      label: 'Vencendo hoje',
      value: summary.dueTodayTasksCount,
      icon: CalendarClock,
      color: 'bg-error-50 text-error-700 border-error-200',
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-bold text-neutral-900">Painel Consolidado de Operações</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Visualize tarefas, progresso diário e agenda em uma única superfície. Use os filtros na topbar para
          refinar por palavra-chave e prioridade.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
              <div className="mb-2 flex items-center justify-between">
                <Icon size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">Live</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm font-semibold">{card.label}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.5fr_1fr]">
        <TasksPanel
          tasks={filteredTasks}
          loading={tasksLoading}
          error={tasksError}
          sourceHint={tasksHint}
          onRetry={() => setReloadCount((previous) => previous + 1)}
        />

        <CalendarPanel
          events={events}
          loading={eventsLoading}
          error={eventsError}
          sourceHint={eventsHint}
          onRetry={() => setReloadCount((previous) => previous + 1)}
        />
      </section>
    </div>
  );
}
