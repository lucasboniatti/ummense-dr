import { useEffect, useState } from 'react';
import { EventItem } from '../../services/events.service';

interface EventEditorProps {
  open: boolean;
  event: EventItem | null;
  loading: boolean;
  cardIdHint?: number | null;
  taskIdHint?: number | null;
  onCancel: () => void;
  onCreate: (payload: {
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    cardId: number | null;
    taskId: number | null;
  }) => Promise<void> | void;
  onUpdate: (
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
  onDelete: (eventId: string) => Promise<void> | void;
}

interface EventFormState {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  cardId: string;
  taskId: string;
}

function toLocalDateTimeInput(value: string | null): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offset = parsed.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(parsed.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}

function fromLocalDateTimeInput(value: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function initialForm(event: EventItem | null, cardIdHint?: number | null, taskIdHint?: number | null): EventFormState {
  return {
    title: event?.title || '',
    description: event?.description || '',
    startsAt: toLocalDateTimeInput(event?.starts_at || null),
    endsAt: toLocalDateTimeInput(event?.ends_at || null),
    cardId: String(event?.card_id ?? cardIdHint ?? ''),
    taskId: String(event?.task_id ?? taskIdHint ?? ''),
  };
}

export default function EventEditor({
  open,
  event,
  loading,
  cardIdHint,
  taskIdHint,
  onCancel,
  onCreate,
  onUpdate,
  onDelete,
}: EventEditorProps) {
  const [form, setForm] = useState<EventFormState>(initialForm(event, cardIdHint, taskIdHint));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm(event, cardIdHint, taskIdHint));
    setError(null);
  }, [event, open, cardIdHint, taskIdHint]);

  if (!open) {
    return null;
  }

  const isEdit = Boolean(event?.id);

  const submit = async () => {
    if (!form.title.trim()) {
      setError('Título é obrigatório.');
      return;
    }

    const startsAt = fromLocalDateTimeInput(form.startsAt);
    if (!startsAt) {
      setError('Data/hora de início inválida.');
      return;
    }

    const endsAt = form.endsAt ? fromLocalDateTimeInput(form.endsAt) : null;
    if (form.endsAt && !endsAt) {
      setError('Data/hora de término inválida.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startsAt,
      endsAt,
      cardId: form.cardId ? Number(form.cardId) : null,
      taskId: form.taskId ? Number(form.taskId) : null,
    };

    setError(null);

    if (isEdit && event?.id) {
      await onUpdate(event.id, payload);
      return;
    }

    await onCreate(payload);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3 className="text-lg font-bold text-neutral-900">
            {isEdit ? 'Editar evento' : 'Novo evento'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700"
          >
            Fechar
          </button>
        </header>

        <div className="space-y-3 p-5">
          {error && (
            <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
              Título
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, description: event.target.value }))
              }
              className="h-20 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Início
              </label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, startsAt: event.target.value }))
                }
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Término
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, endsAt: event.target.value }))
                }
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Card (opcional)
              </label>
              <input
                type="number"
                value={form.cardId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, cardId: event.target.value }))
                }
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="ID do card"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Tarefa (opcional)
              </label>
              <input
                type="number"
                value={form.taskId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, taskId: event.target.value }))
                }
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="ID da tarefa"
              />
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? 'Salvando...' : isEdit ? 'Salvar evento' : 'Criar evento'}
          </button>

          {isEdit && event?.id && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void onDelete(event.id)}
              className="rounded-lg bg-error-600 px-3 py-2 text-sm font-semibold text-white hover:bg-error-700 disabled:opacity-60"
            >
              Remover evento
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
