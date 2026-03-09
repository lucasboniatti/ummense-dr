import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  CircleAlert,
  UserRound,
} from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

export interface TaskTag {
  id: number;
  name: string;
  color: string;
}

export interface PanelTask {
  id: number;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedTo: string | null;
  cardId: number;
  cardName: string;
  progress: number;
  tags: TaskTag[];
}

interface TasksPanelProps {
  tasks: PanelTask[];
  loading: boolean;
  error: string | null;
  sourceHint: string | null;
  onRetry: () => void;
}

function priorityAccent(priority: string): string {
  if (priority === 'P1') return 'bg-error-500';
  if (priority === 'P2') return 'bg-warning-500';
  return 'bg-primary-500';
}

function priorityChip(priority: string): string {
  if (priority === 'P1') return 'bg-error-50 text-error-700';
  if (priority === 'P2') return 'bg-warning-50 text-warning-700';
  return 'bg-primary-50 text-primary-700';
}

function statusLabel(status: string): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'todo') return 'A iniciar';
  return 'Aberta';
}

function statusTone(status: string): string {
  if (status === 'completed') return 'bg-success-50 text-success-700';
  if (status === 'in_progress') return 'bg-primary-50 text-primary-700';
  if (status === 'todo') return 'bg-neutral-100 text-neutral-700';
  return 'bg-warning-50 text-warning-700';
}

function formatDueDate(value: string | null): string {
  if (!value) {
    return 'Sem prazo';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function dueTone(value: string | null): string {
  if (!value) {
    return 'bg-neutral-100 text-neutral-600';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'bg-neutral-100 text-neutral-600';
  }

  const dueDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  if (dueDay < todayDay) {
    return 'bg-error-50 text-error-700';
  }

  if (dueDay === todayDay) {
    return 'bg-warning-50 text-warning-700';
  }

  return 'bg-success-50 text-success-700';
}

function resolveProgress(status: string, progress: number): number {
  if (progress > 0) return Math.min(100, Math.max(0, Math.round(progress)));
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 65;
  if (status === 'todo') return 30;
  return 12;
}

function initials(name: string | null): string {
  const safe = (name || '').trim();
  if (!safe) return '?';

  const parts = safe.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

export default function TasksPanel({
  tasks,
  loading,
  error,
  sourceHint,
  onRetry,
}: TasksPanelProps) {
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <section className="app-surface overflow-hidden p-4 md:p-5">
      <div data-testid="tasks-panel" className="contents">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div>
            <p className="app-kicker">Execução diária</p>
            <h2 className="mt-2 text-[1.75rem] font-bold tracking-[-0.03em] text-neutral-900">
              Tarefas
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-neutral-600">
            Priorize o que vence hoje, acompanhe responsáveis e abra o card correto sem perder o contexto operacional.
          </p>
        </div>

        <div className="app-surface-muted min-w-[220px] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
            <span>Conclusão do dia</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-2 rounded-full bg-success-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-neutral-600">
            <span>{completedCount} concluídas</span>
            <span>{tasks.length} visíveis</span>
          </div>
        </div>
      </header>

      {sourceHint && (
        <div className="mb-4 rounded-[18px] border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-800">
          {sourceHint}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-[20px] border border-neutral-200 bg-white/80 p-4"
            >
              <div className="mb-3 h-4 w-3/5 rounded bg-neutral-200" />
              <div className="mb-2 h-3 w-2/5 rounded bg-neutral-100" />
              <div className="h-2 w-full rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[20px] border border-error-200 bg-error-50 p-4 text-sm text-error-800">
          <p className="font-semibold">Falha ao carregar tarefas.</p>
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

      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          icon={<CheckSquare size={48} />}
          title="Nenhuma tarefa encontrada"
          description="Você não possui tarefas pendentes para os filtros atuais."
          variant="compact"
        />
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task) => {
            const itemProgress = resolveProgress(task.status, task.progress);

            return (
              <article
                key={task.id}
                data-testid="task-row"
                className="group relative overflow-hidden rounded-[22px] border border-[color:var(--border-subtle)] bg-white/95 p-4 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.45)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:shadow-[0_22px_38px_-28px_rgba(15,23,42,0.5)]"
              >
                <div className={`absolute inset-y-0 left-0 w-1.5 ${priorityAccent(task.priority)}`} />

                <div className="ml-4 flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-neutral-100 text-sm font-bold text-neutral-700">
                    {initials(task.assignedTo)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-[1rem] font-semibold leading-6 text-neutral-900">
                          {task.title}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <Link
                            href={`/cards/${task.cardId}?taskId=${task.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-primary-700 transition hover:bg-primary-100"
                          >
                            {task.cardName}
                            <ArrowUpRight size={12} />
                          </Link>
                          <span className={`rounded-full px-2.5 py-1 ${statusTone(task.status)}`}>
                            {statusLabel(task.status)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 ${priorityChip(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-[148px] rounded-[18px] bg-neutral-50/90 px-3 py-2">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                          <span>Progresso</span>
                          <span>{itemProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                          <div
                            className="h-1.5 rounded-full bg-primary-600 transition-all"
                            style={{ width: `${itemProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1">
                        <UserRound size={12} />
                        {task.assignedTo || 'Não definido'}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${dueTone(task.dueDate)}`}>
                        <CalendarDays size={12} />
                        {formatDueDate(task.dueDate)}
                      </span>
                      {task.status !== 'completed' && task.dueDate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
                          <CircleAlert size={12} />
                          {itemProgress < 100 ? 'Acompanhando execução' : 'Pronto para revisão'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {task.tags.length === 0 && (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                          Sem tags
                        </span>
                      )}

                      {task.tags.map((tag) => (
                        <span
                          key={`${task.id}-${tag.id}`}
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                          style={{ backgroundColor: tag.color || '#64748b' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </div>
    </section>
  );
}
