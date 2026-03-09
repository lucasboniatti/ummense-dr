import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import EventEditor from '../events/EventEditor';
import { Button } from '../ui/Button';

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  cardId: number | null;
  taskId: number | null;
}

interface CalendarPanelProps {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  sourceHint: string | null;
  canEdit?: boolean;
  undatedTasksCount?: number;
  cardIdHint?: number | null;
  taskIdHint?: number | null;
  onCreateEvent?: (payload: {
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    cardId: number | null;
    taskId: number | null;
  }) => Promise<void> | void;
  onUpdateEvent?: (
    eventId: string,
    payload: {
      title?: string;
      description?: string | null;
      startsAt?: string;
      endsAt?: string | null;
      cardId?: number | null;
      taskId?: number | null;
    }
  ) => Promise<void> | void;
  onDeleteEvent?: (eventId: string) => Promise<void> | void;
  onRetry: () => void;
}

const weekLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
type QuickFilter = 'all' | 'next7days' | 'undated';

function eventDate(event: CalendarEvent): Date | null {
  try {
    const parsed = parseISO(event.startsAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveVolumeStyle(eventsCount: number): string {
  if (eventsCount >= 5) {
    return 'border-primary-300 bg-primary-100 text-primary-900';
  }

  if (eventsCount >= 3) {
    return 'border-primary-200 bg-primary-50 text-primary-900';
  }

  if (eventsCount >= 1) {
    return 'border-primary-100 bg-white text-neutral-800';
  }

  return '';
}

export default function CalendarPanel({
  events,
  loading,
  error,
  sourceHint,
  canEdit = false,
  undatedTasksCount = 0,
  cardIdHint = null,
  taskIdHint = null,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRetry,
}: CalendarPanelProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);

  const days = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
      const date = eventDate(event);
      if (!date) return;
      const key = format(date, 'yyyy-MM-dd');
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    });

    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return events
      .map((event) => ({ event, date: eventDate(event) }))
      .filter((entry): entry is { event: CalendarEvent; date: Date } => entry.date !== null)
      .filter((entry) => {
        if (quickFilter === 'all') return true;
        if (quickFilter === 'undated') return false;
        return entry.date >= now && entry.date <= next7Days;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  }, [events, quickFilter]);

  const monthlyEventCount = useMemo(() => {
    return days
      .filter((day) => isSameMonth(day, visibleMonth))
      .reduce((count, day) => {
        const key = format(day, 'yyyy-MM-dd');
        return count + (eventsByDay.get(key)?.length || 0);
      }, 0);
  }, [days, eventsByDay, visibleMonth]);

  const onOpenCreate = () => {
    setActiveEvent(null);
    setIsEditorOpen(true);
  };

  const onOpenEdit = (event: CalendarEvent) => {
    setActiveEvent(event);
    setIsEditorOpen(true);
  };

  const mappedActiveEvent = activeEvent
    ? {
        id: activeEvent.id,
        user_id: '',
        title: activeEvent.title,
        description: null,
        starts_at: activeEvent.startsAt,
        ends_at: activeEvent.endsAt,
        card_id: activeEvent.cardId,
        task_id: activeEvent.taskId,
        metadata: {},
        created_at: activeEvent.startsAt,
        updated_at: activeEvent.startsAt,
      }
    : null;

  const handleCreateEvent = async (payload: {
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    cardId: number | null;
    taskId: number | null;
  }) => {
    if (!onCreateEvent) {
      return;
    }

    setEditorLoading(true);
    try {
      await onCreateEvent(payload);
      setIsEditorOpen(false);
      setActiveEvent(null);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleUpdateEvent = async (
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
    if (!onUpdateEvent) {
      return;
    }

    setEditorLoading(true);
    try {
      await onUpdateEvent(eventId, payload);
      setIsEditorOpen(false);
      setActiveEvent(null);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!onDeleteEvent) {
      return;
    }

    setEditorLoading(true);
    try {
      await onDeleteEvent(eventId);
      setIsEditorOpen(false);
      setActiveEvent(null);
    } finally {
      setEditorLoading(false);
    }
  };

  return (
    <section data-testid="calendar-panel" className="app-surface overflow-hidden p-4 md:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="app-kicker">Agenda</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-[1.75rem] font-bold tracking-[-0.03em] text-neutral-900">
              {format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary-700">
              {monthlyEventCount} eventos no mês
            </span>
          </div>
          <p className="mt-2 max-w-md text-sm text-neutral-600">
            Visualize prazos, próximos eventos e filtros temporais sem sair da superfície operacional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setQuickFilter('next7days')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              quickFilter === 'next7days'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            Próximos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('undated')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              quickFilter === 'undated'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            Sem data
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              quickFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            Todos
          </button>
        </div>

        {canEdit && (
          <Button type="button" onClick={onOpenCreate} size="sm" className="gap-1.5">
            <Plus size={14} />
            Novo evento
          </Button>
        )}
      </div>

      {sourceHint && (
        <div className="mb-4 rounded-[18px] border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-800">
          {sourceHint}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-[18px] bg-neutral-100" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[20px] border border-error-200 bg-error-50 p-4 text-sm text-error-800">
          <p className="font-semibold">Falha ao carregar eventos.</p>
          <p className="mt-1">{error}</p>
          <Button
            type="button"
            onClick={onRetry}
            variant="destructive"
            size="sm"
            className="mt-3"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="app-surface-muted p-3">
            <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">
              {weekLabels.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay.get(key) || [];
                const eventsCount = dayEvents.length;
                const volumeStyle = resolveVolumeStyle(eventsCount);

                return (
                  <div
                    key={key}
                    aria-label={`Dia ${format(day, 'dd/MM/yyyy')} com ${eventsCount} evento(s)`}
                    className={[
                      'relative min-h-[64px] rounded-[18px] border p-2 text-left text-sm transition-colors',
                      isSameMonth(day, visibleMonth)
                        ? 'border-neutral-200 bg-white text-neutral-800'
                        : 'border-neutral-100 bg-neutral-50 text-neutral-400',
                      volumeStyle,
                      isToday(day) ? 'ring-2 ring-primary-300 ring-offset-1 ring-offset-[var(--surface-muted)]' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{format(day, 'd')}</span>
                      {isToday(day) && (
                        <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Hoje
                        </span>
                      )}
                    </div>

                    {eventsCount > 0 && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary-600" />
                        <span className="text-[11px] font-semibold text-neutral-700">
                          {eventsCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-[color:var(--border-subtle)] bg-neutral-50/85 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-neutral-700">
                  Próximos eventos
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Agenda operacional conectada aos cards e tarefas visíveis.
                </p>
              </div>

              {quickFilter === 'undated' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
                  <CalendarDays size={13} />
                  {undatedTasksCount} tarefas sem prazo
                </span>
              )}
            </div>

            {upcomingEvents.length === 0 && quickFilter !== 'undated' && (
              <p className="rounded-[18px] border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-600">
                Nenhum evento programado.
              </p>
            )}

            <ul className="space-y-2">
              {upcomingEvents.map(({ event, date }) => (
                <li
                  key={event.id}
                  className="rounded-[18px] border border-neutral-200 bg-white px-3 py-3 text-sm shadow-[0_12px_24px_-22px_rgba(15,23,42,0.42)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900">{event.title}</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {format(date, "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        {event.cardId ? ` • Card #${event.cardId}` : ''}
                        {event.taskId ? ` • Tarefa #${event.taskId}` : ''}
                      </p>
                    </div>

                    {canEdit && !event.id.startsWith('task-due-') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenEdit(event)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <EventEditor
        open={isEditorOpen}
        event={mappedActiveEvent}
        loading={editorLoading}
        cardIdHint={cardIdHint}
        taskIdHint={taskIdHint}
        onCancel={() => {
          setIsEditorOpen(false);
          setActiveEvent(null);
        }}
        onCreate={handleCreateEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />
    </section>
  );
}
