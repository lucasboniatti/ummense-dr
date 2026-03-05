import { useEffect, useMemo, useState } from 'react';
import { TaskHistoryItem, TaskItem, TaskTag, tasksService } from '../services/tasks.service';
import { FlowTag } from '../services/flows.service';

interface TaskModalProps {
  open: boolean;
  token: string;
  cardId: number;
  task: TaskItem | null;
  availableTags: FlowTag[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

interface TaskFormState {
  title: string;
  description: string;
  priority: string;
  status: string;
  assignedTo: string;
  dueDate: string;
}

function toLocalDateInput(value: string | null): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

function formatHistoryDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
}

function getInitialForm(task: TaskItem | null): TaskFormState {
  return {
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'P3',
    status: task?.status || 'open',
    assignedTo: task?.assignedTo || '',
    dueDate: toLocalDateInput(task?.dueDate || null),
  };
}

export default function TaskModal({
  open,
  token,
  cardId,
  task,
  availableTags,
  onClose,
  onSaved,
}: TaskModalProps) {
  const [form, setForm] = useState<TaskFormState>(getInitialForm(task));
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState('');

  const isEditMode = Boolean(task?.id);
  const title = isEditMode ? 'Editar tarefa' : 'Nova tarefa';

  useEffect(() => {
    setForm(getInitialForm(task));
    setHistory([]);
    setError(null);
    setTaskTags([]);
    setSelectedTagId('');
  }, [task, open]);

  useEffect(() => {
    if (!open || !task?.id || !token) {
      return;
    }

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const items = await tasksService.getHistory(task.id, token);
        setHistory(items);
      } catch (historyError) {
        setHistory([]);
        setError(
          historyError instanceof Error
            ? historyError.message
            : 'Falha ao carregar histórico da tarefa.'
        );
      } finally {
        setLoadingHistory(false);
      }
    };

    void loadHistory();
  }, [open, task?.id, token]);

  useEffect(() => {
    if (!open || !task?.id || !token) {
      return;
    }

    const loadTags = async () => {
      try {
        const items = await tasksService.getTags(task.id, token);
        setTaskTags(items);
      } catch {
        setTaskTags([]);
      }
    };

    void loadTags();
  }, [open, task?.id, token]);

  const canSubmit = useMemo(() => form.title.trim().length > 2, [form.title]);

  if (!open) {
    return null;
  }

  const onSubmit = async () => {
    if (!token) {
      setError('Token JWT ausente. Não é possível salvar tarefa.');
      return;
    }

    if (!canSubmit) {
      setError('Título é obrigatório e deve ter ao menos 3 caracteres.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        assignedTo: form.assignedTo.trim() || null,
        dueDate: form.dueDate || null,
      };

      if (isEditMode && task?.id) {
        const updatedTask = await tasksService.update(task.id, token, payload);

        const currentTags = await tasksService.getTags(updatedTask.id, token);
        const currentIds = new Set(currentTags.map((tag) => Number(tag.id)));
        const desiredIds = new Set(taskTags.map((tag) => Number(tag.id)));

        const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

        await Promise.all([
          ...toAdd.map((tagId) => tasksService.addTag(updatedTask.id, tagId, token)),
          ...toRemove.map((tagId) => tasksService.removeTag(updatedTask.id, tagId, token)),
        ]);
      } else {
        const createdTask = await tasksService.create(token, {
          ...payload,
          cardId,
        });

        if (taskTags.length > 0) {
          await Promise.all(
            taskTags.map((tag) => tasksService.addTag(createdTask.id, Number(tag.id), token))
          );
        }
      }

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Falha ao salvar tarefa.'
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!task?.id || !token) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await tasksService.remove(task.id, token);
      await onSaved();
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Falha ao remover tarefa.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const onAddTag = () => {
    if (!selectedTagId) {
      return;
    }

    const tagId = Number(selectedTagId);
    if (!Number.isFinite(tagId)) {
      return;
    }

    const fullTag = availableTags.find((tag) => Number(tag.id) === tagId);
    if (!fullTag) {
      return;
    }

    if (taskTags.some((tag) => Number(tag.id) === tagId)) {
      setSelectedTagId('');
      return;
    }

    setTaskTags((previous) => [
      ...previous,
      {
        id: fullTag.id,
        name: fullTag.name,
        color: fullTag.color,
      },
    ]);
    setSelectedTagId('');
  };

  const onRemoveTag = (tagId: number) => {
    setTaskTags((previous) => previous.filter((tag) => Number(tag.id) !== Number(tagId)));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
            <p className="text-xs text-neutral-600">
              Card #{cardId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Fechar
          </button>
        </header>

        <div className="grid max-h-[calc(92vh-72px)] grid-cols-1 overflow-y-auto lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-3 border-b border-neutral-200 p-5 lg:border-b-0 lg:border-r">
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
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                placeholder="Ex.: Revisar estratégia de onboarding"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                className="h-24 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                placeholder="Detalhes da tarefa..."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Prioridade
                </label>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((previous) => ({ ...previous, priority: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="open">open</option>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                  <option value="blocked">blocked</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Responsável
                </label>
                <input
                  type="text"
                  value={form.assignedTo}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, assignedTo: event.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                  placeholder="Nome do responsável"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Prazo
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((previous) => ({ ...previous, dueDate: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                />
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-700">
                Tags da tarefa
              </h4>

              <div className="mt-2 flex flex-wrap gap-2">
                {taskTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => onRemoveTag(Number(tag.id))}
                      className="rounded bg-white/20 px-1"
                    >
                      x
                    </button>
                  </span>
                ))}
                {taskTags.length === 0 && (
                  <span className="text-xs text-neutral-600">Sem tags vinculadas.</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={selectedTagId}
                  onChange={(event) => setSelectedTagId(event.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">Selecionar tag</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onAddTag}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Adicionar tag
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving}
                className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Criar tarefa'}
              </button>

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => void onDelete()}
                  disabled={deleting}
                  className="rounded-lg bg-error-600 px-3 py-2 text-sm font-semibold text-white hover:bg-error-700 disabled:opacity-60"
                >
                  {deleting ? 'Removendo...' : 'Remover tarefa'}
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-3 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-700">
              Histórico da tarefa
            </h3>

            {loadingHistory && (
              <p className="text-sm text-neutral-600">Carregando histórico...</p>
            )}

            {!loadingHistory && history.length === 0 && (
              <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                Sem histórico disponível.
              </p>
            )}

            <div className="space-y-2">
              {history.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-neutral-900">{item.action}</p>
                  <p className="mt-1 text-[11px] text-neutral-600">
                    {formatHistoryDate(item.created_at)}
                  </p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
