import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Tag as TagIcon, Trash2, UserRound } from 'lucide-react';
import { FlowTag } from '../services/flows.service';
import { TaskHistoryItem, TaskItem, TaskTag, tasksService } from '../services/tasks.service';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/Dialog';
import { Input } from './ui/Input';
import { ProgressSegments } from './ui/ProgressSegments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import { useToast } from '@/contexts/ToastContext';

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

function statusTone(status: string): 'success' | 'info' | 'error' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'blocked') return 'error';
  return 'neutral';
}

function priorityTone(priority: string): 'error' | 'warning' | 'info' {
  if (priority === 'P1') return 'error';
  if (priority === 'P2') return 'warning';
  return 'info';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskTags, setTaskTags] = useState<TaskTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState('');
  const { success } = useToast();

  const isEditMode = Boolean(task?.id);
  const modalTitle = isEditMode ? 'Editar tarefa' : 'Nova tarefa';
  const fieldIdPrefix = `task-${task?.id ?? 'new'}`;

  useEffect(() => {
    setForm(getInitialForm(task));
    setHistory([]);
    setError(null);
    setTaskTags([]);
    setSelectedTagId('');
    setShowDeleteConfirm(false);
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
  const progressFilled = useMemo(() => {
    if (form.status === 'completed') return 4;
    if (form.status === 'in_progress') return 3;
    if (form.status === 'todo') return 2;
    if (form.status === 'blocked') return 1;
    return 1;
  }, [form.status]);

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
      success(
        isEditMode ? 'Tarefa atualizada' : 'Tarefa criada',
        `A tarefa "${form.title.trim()}" foi ${isEditMode ? 'atualizada' : 'criada'} com sucesso.`
      );
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
      success('Tarefa excluída', 'A tarefa foi removida com sucesso.');
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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        data-testid="task-modal"
        className="max-h-[94vh] max-w-6xl overflow-hidden rounded-[var(--radius-2xl)] bg-[color:var(--surface-card)] shadow-[0_24px_64px_rgba(6,18,36,0.25)]"
      >
        <DialogHeader className="px-5 py-4 md:px-6">
          <div className="pr-10">
            <p className="app-kicker">Workspace de tarefa</p>
            <DialogTitle className="mt-2 text-[1.45rem]">
              {modalTitle}
            </DialogTitle>
            <DialogDescription className="mt-2">
              Ajuste responsáveis, status, prazo e contexto sem sair da superfície operacional do card.
            </DialogDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutral">Card #{cardId}</Badge>
              {isEditMode && task && (
                <>
                  <Badge tone={statusTone(task.status)}>{statusLabel(task.status)}</Badge>
                  <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[calc(94vh-132px)] grid-cols-1 overflow-y-auto lg:grid-cols-[1.12fr_0.88fr]">
          <section className="space-y-4 border-b border-[color:var(--border-subtle)] p-5 lg:border-b-0 lg:border-r lg:p-6">
            {error && (
              <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800">
                {error}
              </div>
            )}

            <article className="app-surface-muted p-4">
              <div className="grid gap-4">
                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-title`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
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
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
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
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[color:var(--text-strong)]">
                  Propriedades da tarefa
                </h3>
              </header>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-priority`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
                  >
                    Prioridade
                  </label>
                  <Select
                    value={form.priority}
                    onValueChange={(priority) =>
                      setForm((previous) => ({ ...previous, priority }))
                    }
                  >
                    <SelectTrigger id={`${fieldIdPrefix}-priority`}>
                      <SelectValue placeholder="Selecione uma prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P1">P1 · Alta</SelectItem>
                      <SelectItem value="P2">P2 · Média</SelectItem>
                      <SelectItem value="P3">P3 · Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-status`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
                  >
                    Status
                  </label>
                  <Select
                    value={form.status}
                    onValueChange={(status) =>
                      setForm((previous) => ({ ...previous, status }))
                    }
                  >
                    <SelectTrigger id={`${fieldIdPrefix}-status`}>
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberta</SelectItem>
                      <SelectItem value="todo">A iniciar</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="blocked">Bloqueada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor={`${fieldIdPrefix}-assigned-to`}
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
                  >
                    Responsável
                  </label>
                  <div className="relative">
                    <UserRound
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
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
                    className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]"
                  >
                    Prazo
                  </label>
                  <div className="relative">
                    <CalendarDays
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
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
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[color:var(--text-strong)]">
                  Classificação da tarefa
                </h3>
              </header>

              <div className="flex flex-wrap gap-2">
                {taskTags.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => onRemoveTag(Number(tag.id))}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-default)] px-3 py-1.5 text-xs font-semibold transition hover:border-[color:var(--border-accent)]"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}16` : undefined,
                      color: tag.color || 'var(--text-secondary)',
                    }}
                    aria-label={`Remover tag ${tag.name}`}
                  >
                    <TagIcon size={12} />
                    {tag.name}
                  </button>
                ))}

                {taskTags.length === 0 && (
                  <span className="text-sm text-[color:var(--text-muted)]">Sem tags vinculadas.</span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label htmlFor={`${fieldIdPrefix}-tag`} className="sr-only">
                  Selecionar tag
                </label>
                <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                  <SelectTrigger id={`${fieldIdPrefix}-tag`}>
                    <SelectValue placeholder="Selecionar tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag.id} value={String(tag.id)}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="h-11"
                >
                  <Trash2 size={14} className="mr-2" />
                  {deleting ? 'Removendo...' : 'Remover tarefa'}
                </Button>
              )}
            </div>
          </section>

          <aside className="space-y-4 bg-[color:var(--surface-muted)]/45 p-5 lg:p-6">
            <article className="app-surface-muted p-4">
              <header>
                <p className="app-kicker">Resumo</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[color:var(--text-strong)]">
                  Estado atual
                </h3>
              </header>

              <div className="mt-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  <span>Andamento</span>
                  <span>{progressFilled}/4</span>
                </div>
                <ProgressSegments
                  filled={progressFilled}
                  total={4}
                  color={form.status === 'completed' ? 'success' : form.status === 'blocked' ? 'error' : form.priority === 'P1' ? 'warning' : 'primary'}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={statusTone(form.status)}>{statusLabel(form.status)}</Badge>
                <Badge tone={priorityTone(form.priority)}>{form.priority}</Badge>
                {form.assignedTo.trim() && (
                  <Badge tone="neutral">
                    {form.assignedTo.trim()}
                  </Badge>
                )}
                {form.dueDate && (
                  <Badge tone="neutral">
                    {form.dueDate}
                  </Badge>
                )}
              </div>
            </article>

            <article className="app-surface p-4">
              <header className="mb-4">
                <p className="app-kicker">Histórico</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[color:var(--text-strong)]">
                  Timeline da tarefa
                </h3>
              </header>

              {loadingHistory && (
                <p className="text-sm text-[color:var(--text-secondary)]">Carregando histórico...</p>
              )}

              {!loadingHistory && history.length === 0 && (
                <div className="rounded-xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] px-4 py-5 text-sm text-[color:var(--text-muted)]">
                  Sem histórico disponível para esta tarefa.
                </div>
              )}

              <div className="space-y-3">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                        <Clock3 size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-strong)]">
                          {historyLabel(item.action)}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
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
      </DialogContent>
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Remover tarefa"
        description={`Tem certeza que deseja remover a tarefa "${form.title || 'sem título'}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover tarefa"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={onDelete}
      />
    </Dialog>
  );
}
