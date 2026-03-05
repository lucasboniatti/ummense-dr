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
  onRetry: () => void;
}

const weekLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function eventDate(event: CalendarEvent): Date | null {
  try {
    const parsed = parseISO(event.startsAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function CalendarPanel({
  events,
  loading,
  error,
  sourceHint,
  onRetry,
}: CalendarPanelProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());

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
    return events
      .map((event) => ({ event, date: eventDate(event) }))
      .filter((entry): entry is { event: CalendarEvent; date: Date } => entry.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  }, [events]);

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

      <p className="mb-4 text-sm font-semibold text-neutral-600">
        {format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}
      </p>

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

          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(key) || [];

              return (
                <div
                  key={key}
                  className={[
                    'relative rounded-lg border p-2 text-center text-sm',
                    isSameMonth(day, visibleMonth)
                      ? 'border-neutral-200 bg-white text-neutral-800'
                      : 'border-neutral-100 bg-neutral-50 text-neutral-400',
                    isToday(day) ? 'ring-2 ring-primary-300' : '',
                  ].join(' ')}
                >
                  <span className="font-medium">{format(day, 'd')}</span>

                  {dayEvents.length > 0 && (
                    <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary-600" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <h3 className="mb-2 text-sm font-bold text-neutral-800">Próximos eventos</h3>

            {upcomingEvents.length === 0 && (
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
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
