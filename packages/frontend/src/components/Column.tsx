import React from 'react';
import { cn } from '@/lib/utils';

export type ColumnTone = 'active' | 'completed' | 'blocked' | 'inactive' | 'neutral';

interface ColumnProps {
  name: string;
  cardCount: number;
  totalCount?: number;
  hint?: string;
  stateLabel?: string;
  tone?: ColumnTone;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: () => void;
  children?: React.ReactNode;
}

const TONE_STYLES: Record<ColumnTone, { badge: string }> = {
  active: {
    badge: 'bg-primary-100 text-primary-800',
  },
  completed: {
    badge: 'bg-success-100 text-success-800',
  },
  blocked: {
    badge: 'bg-error-100 text-error-800',
  },
  inactive: {
    badge: 'bg-warning-100 text-warning-800',
  },
  neutral: {
    badge: 'bg-neutral-200 text-neutral-700',
  },
};

export function Column({
  name,
  cardCount,
  totalCount,
  hint,
  stateLabel,
  tone = 'neutral',
  onDragOver,
  onDrop,
  children,
}: ColumnProps) {
  const countLabel =
    typeof totalCount === 'number' && totalCount !== cardCount
      ? `${cardCount}/${totalCount}`
      : `${cardCount}`;
  const toneStyle = TONE_STYLES[tone];

  return (
    <section
      data-testid="kanban-column"
      data-column-name={name}
      className={cn(
        'flex w-[280px] flex-shrink-0 flex-col rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] p-3'
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="mb-2 flex items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              {stateLabel || 'Workspace'}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-[color:var(--text-strong)]">
              {name}
            </h3>
          </div>

          <div
            className={cn(
              'inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-2 text-[11px] font-bold',
              toneStyle.badge
            )}
          >
            {countLabel}
          </div>
        </div>
      </header>

      {hint && (
        <p className="mb-3 px-1 text-xs leading-5 text-[color:var(--text-secondary)]">
          {hint}
          {typeof totalCount === 'number' ? ` Total ${totalCount}.` : ''}
        </p>
      )}

      <div className="mt-3 flex min-h-[320px] flex-1 flex-col gap-3">{children}</div>
    </section>
  );
}
