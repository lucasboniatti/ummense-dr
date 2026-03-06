import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import EventEditor from '../events/EventEditor';

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
    return 'border-primary-300 bg-primary-100';
  }

  if (eventsCount >= 3) {
    return 'border-primary-200 bg-primary-50';
  }

  if (eventsCount >= 1) {
    return 'border-primary-100 bg-white';
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
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Calendário</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
            className="rounded-lg border border-neutral-200 p-2 text-neutral-700 hover:bg-neutral-100"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            className="rounded-lg border border-neutral-200 p-2 text-neutral-700 hover:bg-neutral-100"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-600">
          {format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setQuickFilter('next7days')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              quickFilter === 'next7days'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 text-neutral-700'
            }`}
          >
            Próximos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('undated')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              quickFilter === 'undated'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 text-neutral-700'
            }`}
          >
            Sem data
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              quickFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'border border-neutral-300 text-neutral-700'
            }`}
          >
            Todos
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
            >
              Novo evento
            </button>
          )}
        </div>
      </div>

      {sourceHint && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-800">
          {sourceHint}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-800">
          <p className="font-semibold">Falha ao carregar eventos.</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-error-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-error-800"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-4 grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-500">
            {weekLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-neutral-600">
            <span className="text-neutral-500">Volume diário:</span>
            <span className="rounded border border-primary-100 bg-white px-2 py-0.5">
              1-2
            </span>
            <span className="rounded border border-primary-200 bg-primary-50 px-2 py-0.5">
              3-4
            </span>
            <span className="rounded border border-primary-300 bg-primary-100 px-2 py-0.5">
              5+
            </span>
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
                    'relative rounded-lg border p-2 text-center text-sm',
                    isSameMonth(day, visibleMonth)
                      ? 'border-neutral-200 bg-white text-neutral-800'
                      : 'border-neutral-100 bg-neutral-50 text-neutral-400',
                    volumeStyle,
                    isToday(day) ? 'ring-2 ring-primary-300' : '',
                  ].join(' ')}
                >
                  <span className="font-medium">{format(day, 'd')}</span>

                  {eventsCount > 0 && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {eventsCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <h3 className="mb-2 text-sm font-bold text-neutral-800">Próximos eventos</h3>

            {quickFilter === 'undated' && (
              <p className="mb-2 text-sm text-neutral-600">
                Tarefas sem prazo: <strong>{undatedTasksCount}</strong>
              </p>
            )}

            {upcomingEvents.length === 0 && quickFilter !== 'undated' && (
              <p className="text-sm text-neutral-600">Nenhum evento programado.</p>
            )}

            <ul className="space-y-2">
              {upcomingEvents.map(({ event, date }) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-neutral-900">{event.title}</p>
                  <p className="text-xs text-neutral-600">
                    {format(date, "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    {event.cardId ? ` • Card #${event.cardId}` : ''}
                  </p>
                  {canEdit && !event.id.startsWith('task-due-') && (
                    <button
                      type="button"
                      onClick={() => onOpenEdit(event)}
                      className="mt-2 rounded border border-neutral-300 px-2 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100"
                    >
                      Editar
                    </button>
                  )}
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
