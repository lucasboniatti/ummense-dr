import Link from 'next/link';

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

function priorityColor(priority: string): string {
  if (priority === 'P1') return 'bg-error-500';
  if (priority === 'P2') return 'bg-warning-500';
  return 'bg-primary-500';
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

function resolveProgress(status: string, progress: number): number {
  if (progress > 0) return Math.min(100, Math.max(0, Math.round(progress)));
  if (status === 'completed') return 100;
  if (status === 'in_progress') return 65;
  if (status === 'todo') return 30;
  return 12;
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
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Tarefas</h2>
          <p className="text-sm text-neutral-600">
            Acompanhe prioridade, responsável, vínculo de card e prazos.
          </p>
        </div>

        <div className="min-w-[180px]">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-600">
            <span>Progresso geral</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-2 rounded-full bg-success-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {sourceHint && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-800">
          {sourceHint}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-neutral-200 p-4">
              <div className="mb-2 h-4 w-3/5 rounded bg-neutral-200" />
              <div className="h-3 w-2/5 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-800">
          <p className="font-semibold">Falha ao carregar tarefas.</p>
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

      {!loading && !error && tasks.length === 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">
          Nenhuma tarefa encontrada para os filtros atuais.
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task) => {
            const itemProgress = resolveProgress(task.status, task.progress);

            return (
              <article
                key={task.id}
                className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300"
              >
                <div className={`absolute inset-y-0 left-0 w-1 ${priorityColor(task.priority)}`} />

                <div className="ml-3 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-neutral-900">{task.title}</h3>
                    <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                    <Link href={`/cards/${task.cardId}?taskId=${task.id}`} passHref legacyBehavior>
                      <a className="font-semibold text-primary-700 hover:underline">{task.cardName}</a>
                    </Link>
                    <span>Prazo: {formatDueDate(task.dueDate)}</span>
                    <span>
                      Responsável:{' '}
                      <strong className="font-semibold text-neutral-800">
                        {task.assignedTo || 'Não definido'}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {task.tags.length === 0 && (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                        Sem tags
                      </span>
                    )}
                    {task.tags.map((tag) => (
                      <span
                        key={`${task.id}-${tag.id}`}
                        className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: tag.color || '#64748b' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-600">
                      <span>Status: {task.status}</span>
                      <span>{itemProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-2 rounded-full bg-primary-600 transition-all"
                        style={{ width: `${itemProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
