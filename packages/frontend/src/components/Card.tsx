import React, { memo } from 'react';
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
import { ProgressSegments } from './ui/ProgressSegments';

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
    icon: React.ReactNode;
  }
> = {
  active: {
    label: 'Ativo',
    chip: 'app-status-pill app-status-pill-info',
    icon: <ArrowUpRight size={12} />,
  },
  completed: {
    label: 'Concluído',
    chip: 'app-status-pill app-status-pill-success',
    icon: <CheckCircle2 size={12} />,
  },
  blocked: {
    label: 'Bloqueado',
    chip: 'app-status-pill app-status-pill-error',
    icon: <CircleAlert size={12} />,
  },
  inactive: {
    label: 'Inativo',
    chip: 'app-status-pill app-status-pill-warning',
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

export const Card = memo(function Card({
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
    (tasksSummary?.open ?? 0) +
    (tasksSummary?.inProgress ?? 0) +
    (tasksSummary?.completed ?? 0) +
    (tasksSummary?.blocked ?? 0);
  const filledSegments =
    totalTasks > 0
      ? Math.max(1, Math.round(((tasksSummary?.completed ?? 0) / totalTasks) * 4))
      : Math.max(1, Math.round(progressValue / 25));
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
        'group relative overflow-hidden rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)] transition duration-200',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        hasInteraction &&
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)] hover:-translate-y-0.5 hover:border-[color:var(--border-accent)] hover:shadow-[var(--shadow-primary-day)]',
        isPending && 'border-primary-300 bg-primary-50/70 shadow-[var(--shadow-primary-day)]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]">
            <GripVertical size={14} />
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              {responsible || 'Sem responsável'}
            </p>
            <h4 className="text-sm font-bold leading-5 text-[color:var(--text-strong)]">
              {title}
            </h4>

            {description && (
              <p
                className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]"
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
              statusStyle.chip
            )}
          >
            {statusStyle.icon}
            {statusStyle.label}
          </span>

          {isPending ? (
            <span className="app-status-pill app-status-pill-info">
              <Clock3 size={11} />
              Movendo
            </span>
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-muted)] text-[color:var(--text-muted)] transition group-hover:bg-primary-50 group-hover:text-primary-700">
              <ArrowUpRight size={14} />
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[color:var(--text-secondary)]">
        <div className="flex items-center gap-2 rounded-full bg-[color:var(--surface-muted)] px-2.5 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--surface-card)] text-[11px] font-bold text-[color:var(--text-strong)] shadow-sm">
            {initials(responsible)}
          </span>
          <span className="inline-flex items-center gap-1">
            <UserRound size={12} />
            {responsible || 'Sem responsável'}
          </span>
        </div>

        <span className="rounded-full bg-[color:var(--surface-muted)] px-2.5 py-1.5">
          Atualizado {formatCompactDate(updatedAt)}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
          <span>Progresso</span>
          <span>{progressValue}%</span>
        </div>
        <ProgressSegments
          filled={filledSegments}
          total={4}
          color={
            visualStatus === 'completed'
              ? 'success'
              : visualStatus === 'blocked'
                ? 'error'
                : visualStatus === 'inactive'
                  ? 'warning'
                  : 'primary'
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {totalTasks > 0 && (
          <span className="app-status-pill app-status-pill-neutral">
            {tasksSummary?.completed || 0}/{totalTasks} tarefas
          </span>
        )}

        {(tasksSummary?.inProgress || 0) > 0 && (
          <span className="app-status-pill app-status-pill-info">
            {tasksSummary?.inProgress} em andamento
          </span>
        )}

        {(tasksSummary?.blocked || 0) > 0 && (
          <span className="app-status-pill app-status-pill-error">
            {tasksSummary?.blocked} bloqueios
          </span>
        )}
      </div>

      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full border border-[color:var(--border-default)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]"
              style={{ backgroundColor: `color-mix(in srgb, ${tag.color} 12%, white)` }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
