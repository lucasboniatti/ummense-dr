import React from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GripVertical,
  PauseCircle,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowCardStatus, FlowCardTasksSummary } from '../services/flows.service';

type VisualStatus = 'active' | 'completed' | 'blocked' | 'inactive';

interface CardProps {
  id: number;
  title: string;
  description?: string | null;
  status: FlowCardStatus;
  rawStatus?: string | null;
  responsible?: string | null;
  progressPercent?: number;
  tasksSummary?: FlowCardTasksSummary;
  tags?: { id: number; name: string; color: string }[];
  updatedAt?: string;
  isPending?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
}

const STATUS_STYLES: Record<
  VisualStatus,
  {
    label: string;
    chip: string;
    bar: string;
    progress: string;
    icon: React.ReactNode;
  }
> = {
  active: {
    label: 'Ativo',
    chip: 'border-primary-200 bg-primary-50 text-primary-700',
    bar: 'from-primary-500 via-primary-400 to-secondary-400',
    progress: 'bg-primary-600',
    icon: <ArrowUpRight size={12} />,
  },
  completed: {
    label: 'Concluído',
    chip: 'border-success-200 bg-success-50 text-success-700',
    bar: 'from-success-500 via-success-400 to-emerald-300',
    progress: 'bg-success-600',
    icon: <CheckCircle2 size={12} />,
  },
  blocked: {
    label: 'Bloqueado',
    chip: 'border-error-200 bg-error-50 text-error-700',
    bar: 'from-error-500 via-error-400 to-orange-300',
    progress: 'bg-error-500',
    icon: <CircleAlert size={12} />,
  },
  inactive: {
    label: 'Inativo',
    chip: 'border-warning-200 bg-warning-50 text-warning-700',
    bar: 'from-warning-500 via-amber-400 to-neutral-300',
    progress: 'bg-warning-500',
    icon: <PauseCircle size={12} />,
  },
};

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function resolveVisualStatus(
  status: FlowCardStatus,
  rawStatus: string | null | undefined
): VisualStatus {
  const normalizedRawStatus = normalizeText(rawStatus);

  if (
    normalizedRawStatus === 'paused' ||
    normalizedRawStatus === 'pausado' ||
    normalizedRawStatus === 'canceled' ||
    normalizedRawStatus === 'cancelled' ||
    normalizedRawStatus === 'cancelado' ||
    normalizedRawStatus === 'inactive' ||
    normalizedRawStatus === 'inativo'
  ) {
    return 'inactive';
  }

  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'blocked') {
    return 'blocked';
  }

  return 'active';
}

function initials(name: string | null | undefined): string {
  const safe = String(name || '').trim();

  if (!safe) {
    return '--';
  }

  return safe
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatCompactDate(value: string | undefined): string {
  if (!value) {
    return 'Sem data';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Sem data';
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function clampProgress(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function Card({
  id,
  title,
  description,
  status,
  rawStatus,
  responsible,
  progressPercent = 0,
  tasksSummary,
  tags,
  updatedAt,
  isPending = false,
  onClick,
  draggable = true,
  onDragStart,
  onDragEnd,
}: CardProps) {
  const visualStatus = resolveVisualStatus(status, rawStatus);
  const statusStyle = STATUS_STYLES[visualStatus];
  const progressValue = clampProgress(progressPercent);
  const totalTasks =
    tasksSummary?.open +
      tasksSummary?.inProgress +
      tasksSummary?.completed +
      tasksSummary?.blocked || 0;
  const hasInteraction = Boolean(onClick);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasInteraction) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      data-testid="kanban-card"
      data-card-title={title}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={hasInteraction ? 'button' : undefined}
      tabIndex={hasInteraction ? 0 : undefined}
      aria-label={`Abrir card ${title}`}
      aria-busy={isPending}
      data-card-id={id}
      className={cn(
        'group relative overflow-hidden rounded-[24px] border border-[color:var(--border-subtle)] bg-white/96 p-4 shadow-[0_22px_38px_-32px_rgba(15,23,42,0.55)] transition duration-200',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        hasInteraction &&
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:shadow-[0_28px_42px_-34px_rgba(15,23,42,0.6)]',
        isPending && 'border-primary-300 bg-primary-50/80 shadow-[0_18px_38px_-28px_rgba(37,99,235,0.38)]'
      )}
    >
      <div
        className={cn(
          'absolute inset-x-4 top-0 h-1 rounded-b-full bg-gradient-to-r',
          statusStyle.bar
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-neutral-100 text-neutral-500">
            <GripVertical size={14} />
          </div>

          <div className="min-w-0">
            <h4 className="text-[0.98rem] font-semibold leading-5 text-neutral-900">
              {title}
            </h4>

            {description && (
              <p
                className="mt-1 text-xs leading-5 text-neutral-500"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
              statusStyle.chip
            )}
          >
            {statusStyle.icon}
            {statusStyle.label}
          </span>

          {isPending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700">
              <Clock3 size={11} />
              Movendo
            </span>
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition group-hover:bg-primary-50 group-hover:text-primary-700">
              <ArrowUpRight size={14} />
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600">
        <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-2.5 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-neutral-700 shadow-sm">
            {initials(responsible)}
          </span>
          <span className="inline-flex items-center gap-1">
            <UserRound size={12} />
            {responsible || 'Sem responsável'}
          </span>
        </div>

        <span className="rounded-full bg-neutral-100 px-2.5 py-1.5">
          Atualizado {formatCompactDate(updatedAt)}
        </span>
      </div>

      <div className="mt-3 rounded-[18px] bg-neutral-50/90 p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
          <span>Progresso</span>
          <span>{progressValue}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className={cn('h-1.5 rounded-full transition-all', statusStyle.progress)}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {totalTasks > 0 && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
            {tasksSummary?.completed || 0}/{totalTasks} tarefas
          </span>
        )}

        {(tasksSummary?.inProgress || 0) > 0 && (
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
            {tasksSummary?.inProgress} em andamento
          </span>
        )}

        {(tasksSummary?.blocked || 0) > 0 && (
          <span className="rounded-full bg-error-50 px-2.5 py-1 text-[11px] font-semibold text-error-700">
            {tasksSummary?.blocked} bloqueios
          </span>
        )}
      </div>

      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
