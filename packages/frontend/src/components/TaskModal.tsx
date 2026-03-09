import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Tag as TagIcon, Trash2, UserRound, X } from 'lucide-react';
import { FlowTag } from '../services/flows.service';
import { TaskHistoryItem, TaskItem, TaskTag, tasksService } from '../services/tasks.service';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function statusLabel(status: string): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'todo') return 'A iniciar';
  if (status === 'blocked') return 'Bloqueada';
  return 'Aberta';
}

function statusTone(status: string): string {
  if (status === 'completed') return 'bg-success-50 text-success-700';
  if (status === 'in_progress') return 'bg-primary-50 text-primary-700';
  if (status === 'blocked') return 'bg-error-50 text-error-700';
  return 'bg-neutral-100 text-neutral-700';
}

function priorityTone(priority: string): string {
  if (priority === 'P1') return 'bg-error-50 text-error-700';
  if (priority === 'P2') return 'bg-warning-50 text-warning-700';
  return 'bg-primary-50 text-primary-700';
}

function historyLabel(action: string): string {
  const normalized = action.replace(/[._-]+/g, ' ').trim();
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Atualização';
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
  const modalTitle = isEditMode ? 'Editar tarefa' : 'Nova tarefa';
  const fieldIdPrefix = `task-${task?.id ?? 'new'}`;

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
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar tarefa.');
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
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao remover tarefa.');
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
    <div
      data-testid="task-modal"
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
    >
      <div className="app-surface max-h-[94vh] w-full max-w-5xl overflow-hidden">
        <header className="border-b border-[color:var(--border-subtle)] px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="app-kicker">Workspace de tarefa</p>
              <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.03em] text-neutral-900">
                {modalTitle}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                  Card #{cardId}
                </span>
                {isEditMode && task && (
                  <>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(
                        task.status
                      )}`}
                    >
                      {statusLabel(task.status)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${priorityTone(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </>
                )}
              </div>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-10">
              <X size={16} className="mr-2" />
              Fechar
            </Button>
          </div>
        </header>

        <div className="grid max-h-[calc(94vh-104px)] grid-cols-1 overflow-y-auto lg:grid-cols-[1.18fr_0.82fr]">
          <section className="space-y-4 border-b border-[color:var(--border-subtle)] p-5 lg:border-b-0 lg:border-r lg:p-6">
            {error && (
              <div className="rounded-[18px] border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800">
                {error}
              </div>
            )}

            <article className="app-surface-muted p-4">
              <div className="grid gap-4">
                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-title`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500"
                  >
                    Título
                  </label>
                  <Input
                    id={`${fieldIdPrefix}-title`}
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, title: event.target.value }))
                    }
                    placeholder="Ex.: Revisar estratégia de onboarding"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-description`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500"
                  >
                    Descrição
                  </label>
                  <textarea
                    id={`${fieldIdPrefix}-description`}
                    value={form.description}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, description: event.target.value }))
                    }
                    className="app-control min-h-[120px] w-full resize-y px-3.5 py-3 text-sm leading-6"
                    placeholder="Descreva a entrega da tarefa."
                  />
                </div>
              </div>
            </article>

            <article className="app-surface p-4">
              <header className="mb-4">
                <p className="app-kicker">Operação</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-neutral-900">
                  Propriedades da tarefa
                </h3>
              </header>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-priority`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500"
                  >
                    Prioridade
                  </label>
                  <select
                    id={`${fieldIdPrefix}-priority`}
                    value={form.priority}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, priority: event.target.value }))
                    }
                    className="app-control h-11 w-full bg-white px-3.5 text-sm text-neutral-900"
                  >
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-status`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500"
                  >
                    Status
                  </label>
                  <select
                    id={`${fieldIdPrefix}-status`}
                    value={form.status}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, status: event.target.value }))
                    }
                    className="app-control h-11 w-full bg-white px-3.5 text-sm text-neutral-900"
                  >
                    <option value="open">Aberta</option>
                    <option value="todo">A iniciar</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="completed">Concluída</option>
                    <option value="blocked">Bloqueada</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-assigned-to`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500"
                  >
                    Responsável
                  </label>
                  <div className="relative">
                    <UserRound
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <Input
                      id={`${fieldIdPrefix}-assigned-to`}
                      type="text"
                      value={form.assignedTo}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, assignedTo: event.target.value }))
                      }
                      placeholder="Nome do responsável"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-due-date`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-neutral-500"
                  >
                    Prazo
                  </label>
                  <div className="relative">
                    <CalendarDays
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <Input
                      id={`${fieldIdPrefix}-due-date`}
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, dueDate: event.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </article>

            <article className="app-surface p-4">
              <header className="mb-4">
                <p className="app-kicker">Tags</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-neutral-900">
                  Classificação da tarefa
                </h3>
              </header>

              <div className="flex flex-wrap gap-2">
                {taskTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    <TagIcon size={12} />
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => onRemoveTag(Number(tag.id))}
                      className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]"
                      aria-label={`Remover tag ${tag.name}`}
                    >
                      x
                    </button>
                  </span>
                ))}

                {taskTags.length === 0 && (
                  <span className="text-sm text-neutral-500">Sem tags vinculadas.</span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label htmlFor={`${fieldIdPrefix}-tag`} className="sr-only">
                  Selecionar tag
                </label>
                <select
                  id={`${fieldIdPrefix}-tag`}
                  value={selectedTagId}
                  onChange={(event) => setSelectedTagId(event.target.value)}
                  className="app-control h-11 bg-white px-3.5 text-sm text-neutral-900"
                >
                  <option value="">Selecionar tag</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddTag}
                  className="h-11"
                >
                  Adicionar tag
                </Button>
              </div>
            </article>

            <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border-subtle)] pt-4">
              <Button type="button" onClick={() => void onSubmit()} disabled={saving} className="h-11">
                {saving ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Criar tarefa'}
              </Button>

              {isEditMode && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void onDelete()}
                  disabled={deleting}
                  className="h-11"
                >
                  <Trash2 size={14} className="mr-2" />
                  {deleting ? 'Removendo...' : 'Remover tarefa'}
                </Button>
              )}
            </div>
          </section>

          <aside className="space-y-4 p-5 lg:p-6">
            <article className="app-surface-muted p-4">
              <header>
                <p className="app-kicker">Resumo</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-neutral-900">
                  Estado atual
                </h3>
              </header>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(
                    form.status
                  )}`}
                >
                  {statusLabel(form.status)}
                </span>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${priorityTone(
                    form.priority
                  )}`}
                >
                  {form.priority}
                </span>
                {form.assignedTo.trim() && (
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                    {form.assignedTo.trim()}
                  </span>
                )}
                {form.dueDate && (
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                    {form.dueDate}
                  </span>
                )}
              </div>
            </article>

            <article className="app-surface p-4">
              <header className="mb-4">
                <p className="app-kicker">Histórico</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-neutral-900">
                  Timeline da tarefa
                </h3>
              </header>

              {loadingHistory && (
                <p className="text-sm text-neutral-600">Carregando histórico...</p>
              )}

              {!loadingHistory && history.length === 0 && (
                <div className="rounded-[18px] border border-dashed border-[color:var(--border-strong)] bg-white/65 px-4 py-5 text-sm text-neutral-500">
                  Sem histórico disponível para esta tarefa.
                </div>
              )}

              <div className="space-y-3">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[20px] border border-[color:var(--border-subtle)] bg-white/94 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                        <Clock3 size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {historyLabel(item.action)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatHistoryDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
}
