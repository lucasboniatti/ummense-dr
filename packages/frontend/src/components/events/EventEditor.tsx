import { useEffect, useState } from 'react';
import { EventItem } from '../../services/events.service';
import {
  fromLocalDateTimeInput,
  toLocalDateTimeInput,
} from '../../utils/datetime-local';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Editar evento' : 'Novo evento'}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/55 px-4 py-6 backdrop-blur-sm"
    >
      <div className="app-surface w-full max-w-2xl overflow-hidden bg-[var(--surface-raised)]">
        <header className="flex items-start justify-between gap-3 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div>
            <p className="app-kicker">Agenda operacional</p>
            <h3 className="mt-2 text-xl font-bold tracking-[-0.02em] text-neutral-900">
              {isEdit ? 'Editar evento' : 'Novo evento'}
            </h3>
          </div>
          <Button type="button" onClick={onCancel} variant="outline" size="sm">
            Fechar
          </Button>
        </header>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-[18px] border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
              Título
            </label>
            <Input
              type="text"
              value={form.title}
              onChange={(nextEvent) => setForm((previous) => ({ ...previous, title: nextEvent.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(nextEvent) =>
                setForm((previous) => ({ ...previous, description: nextEvent.target.value }))
              }
              className="app-control h-24 w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Início
              </label>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(nextEvent) =>
                  setForm((previous) => ({ ...previous, startsAt: nextEvent.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Término
              </label>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(nextEvent) =>
                  setForm((previous) => ({ ...previous, endsAt: nextEvent.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Card (opcional)
              </label>
              <Input
                type="number"
                value={form.cardId}
                onChange={(nextEvent) =>
                  setForm((previous) => ({ ...previous, cardId: nextEvent.target.value }))
                }
                placeholder="ID do card"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Tarefa (opcional)
              </label>
              <Input
                type="number"
                value={form.taskId}
                onChange={(nextEvent) =>
                  setForm((previous) => ({ ...previous, taskId: nextEvent.target.value }))
                }
                placeholder="ID da tarefa"
              />
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border-subtle)] px-5 py-4">
          <Button type="button" disabled={loading} onClick={() => void submit()}>
            {loading ? 'Salvando...' : isEdit ? 'Salvar evento' : 'Criar evento'}
          </Button>

          {isEdit && event?.id && (
            <Button
              type="button"
              disabled={loading}
              onClick={() => void onDelete(event.id)}
              variant="destructive"
            >
              Remover evento
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
