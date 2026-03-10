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
import { Badge } from '../ui/Badge';
import { ProgressSegments } from '../ui/ProgressSegments';
import { SkeletonList } from '../ui/Skeleton';
import { TaskItem } from '../ui/TaskItem';

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

function priorityChip(priority: string): 'error' | 'warning' | 'info' {
  if (priority === 'P1') return 'error';
  if (priority === 'P2') return 'warning';
  return 'info';
}

function statusLabel(status: string): string {
  if (status === 'completed') return 'Concluída';
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'todo') return 'A iniciar';
  return 'Aberta';
}

function statusTone(status: string): 'success' | 'info' | 'neutral' | 'warning' {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'todo') return 'neutral';
  return 'warning';
}

function parseDateValue(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDueDate(value: string | null): string {
  if (!value) {
    return 'Sem prazo';
  }

  const parsed = parseDateValue(value);
  if (!parsed) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function dueTone(value: string | null): 'error' | 'warning' | 'success' | 'neutral' {
  if (!value) {
    return 'neutral';
  }

  const parsed = parseDateValue(value);
  if (!parsed) {
    return 'neutral';
  }

  const dueDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const today = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  if (dueDay < todayDay) {
    return 'error';
  }

  if (dueDay === todayDay) {
    return 'warning';
  }

  return 'success';
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
  const progressSegmentsFilled = tasks.length > 0 ? Math.max(1, Math.round((progressPercent / 100) * 4)) : 0;

  return (
    <section className="app-surface overflow-hidden p-4 md:p-5">
      <div data-testid="tasks-panel" className="contents">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div>
            <p className="app-kicker">Execução diária</p>
            <h2 className="font-display mt-2 text-[1.75rem] font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">
              Tarefas
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-[color:var(--text-secondary)]">
            Priorize o que vence hoje, acompanhe responsáveis e abra o card correto sem perder o contexto operacional.
          </p>
        </div>

        <div className="app-surface-muted min-w-[220px] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
            <span>Conclusão do dia</span>
            <span>{progressPercent}%</span>
          </div>
          <ProgressSegments
            filled={progressSegmentsFilled}
            total={4}
            color={progressPercent >= 75 ? 'success' : progressPercent >= 40 ? 'warning' : 'info'}
          />
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-[color:var(--text-secondary)]">
            <span>{completedCount} concluídas</span>
            <span>{tasks.length} visíveis</span>
          </div>
        </div>
      </header>

      {sourceHint && (
        <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-800">
          {sourceHint}
        </div>
      )}

      {loading && (
        <SkeletonList items={4} />
      )}

      {!loading && error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-800">
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
            const dueBadgeTone = dueTone(task.dueDate);
            const isUrgent = dueBadgeTone === 'error' || dueBadgeTone === 'warning';

            return (
              <article
                key={task.id}
                data-testid="task-row"
                data-task-id={task.id}
                className="group rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-3 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-accent)] hover:shadow-[var(--shadow-primary-day)]"
              >
                <div className="flex flex-col gap-3">
                  <TaskItem
                    title={task.title}
                    category={task.cardName}
                    date={formatDueDate(task.dueDate)}
                    isUrgent={isUrgent}
                    isCompleted={task.status === 'completed'}
                    priority={task.priority === 'P1' ? 'urgent' : task.priority === 'P2' ? 'high' : 'none'}
                    assigneeFallback={initials(task.assignedTo)}
                  />

                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[color:var(--text-secondary)]">
                      <Badge tone={statusTone(task.status)}>
                        {statusLabel(task.status)}
                      </Badge>
                      <Badge tone={priorityChip(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge tone="neutral" className="normal-case tracking-normal">
                        <UserRound size={12} />
                        {task.assignedTo || 'Não definido'}
                      </Badge>
                      <Badge tone={dueBadgeTone} className="normal-case tracking-normal">
                        <CalendarDays size={12} />
                        {formatDueDate(task.dueDate)}
                      </Badge>
                      {task.status !== 'completed' && task.dueDate && (
                        <Badge tone="neutral" className="normal-case tracking-normal">
                          <CircleAlert size={12} />
                          {itemProgress < 100 ? 'Acompanhando execução' : 'Pronto para revisão'}
                        </Badge>
                      )}
                    </div>

                    <div className="min-w-[188px] rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-3 py-3">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                        <span>Progresso</span>
                        <span>{itemProgress}%</span>
                      </div>
                      <ProgressSegments
                        filled={Math.max(1, Math.round(itemProgress / 25))}
                        total={4}
                        color={itemProgress >= 100 ? 'success' : itemProgress >= 50 ? 'primary' : 'warning'}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/cards/${task.cardId}?taskId=${task.id}`}
                      className="app-status-pill app-status-pill-info transition hover:opacity-90"
                    >
                      {task.cardName}
                      <ArrowUpRight size={12} />
                    </Link>
                    {task.tags.length === 0 ? (
                      <Badge tone="neutral" className="normal-case tracking-normal">
                        Sem tags
                      </Badge>
                    ) : (
                      task.tags.map((tag) => (
                        <span
                          key={`${task.id}-${tag.id}`}
                          className="rounded-full border border-[color:var(--border-default)] px-2.5 py-1 text-[11px] font-semibold"
                          style={{
                            backgroundColor: tag.color ? `${tag.color}1A` : undefined,
                            color: tag.color || 'var(--text-secondary)',
                          }}
                        >
                          {tag.name}
                        </span>
                      ))
                    )}
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
