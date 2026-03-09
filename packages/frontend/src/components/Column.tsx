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

const TONE_STYLES: Record<ColumnTone, { shell: string; header: string; badge: string }> = {
  active: {
    shell:
      'border-primary-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(255,255,255,0.86))]',
    header: 'border-primary-200/80 bg-white/85',
    badge: 'bg-primary-100 text-primary-800',
  },
  completed: {
    shell:
      'border-success-200/80 bg-[linear-gradient(180deg,rgba(240,253,244,0.92),rgba(255,255,255,0.86))]',
    header: 'border-success-200/80 bg-white/88',
    badge: 'bg-success-100 text-success-800',
  },
  blocked: {
    shell:
      'border-error-200/80 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.9))]',
    header: 'border-error-200/80 bg-white/90',
    badge: 'bg-error-100 text-error-800',
  },
  inactive: {
    shell:
      'border-warning-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.9))]',
    header: 'border-warning-200/80 bg-white/90',
    badge: 'bg-warning-100 text-warning-800',
  },
  neutral: {
    shell:
      'border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.88))]',
    header: 'border-[color:var(--border-subtle)] bg-white/88',
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
        'flex w-[304px] flex-shrink-0 flex-col rounded-[28px] border p-3 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.36)] backdrop-blur',
        toneStyle.shell
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header
        className={cn(
          'rounded-[22px] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
          toneStyle.header
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="app-kicker">{stateLabel || 'Workspace'}</p>
            <h3 className="mt-2 truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-neutral-900">
              {name}
            </h3>
          </div>

          <div
            className={cn(
              'inline-flex min-w-[58px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold',
              toneStyle.badge
            )}
          >
            {countLabel}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">
            Cards visíveis
          </span>
          {typeof totalCount === 'number' && (
            <span className="text-xs font-medium text-neutral-500">Total {totalCount}</span>
          )}
        </div>

        {hint && <p className="mt-2 text-xs leading-5 text-neutral-600">{hint}</p>}
      </header>

      <div className="mt-3 flex min-h-[320px] flex-1 flex-col gap-3">{children}</div>
    </section>
  );
}
