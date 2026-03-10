'use client';

import React from 'react';
import { Badge } from './ui/Badge';
import { ProgressSegments } from './ui/ProgressSegments';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable' | { date: string; rate?: number; duration?: number }[];
  lowerIsBetter?: boolean;
  trendValue?: string;
  trendLabel?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  failedExecutions?: { automation: string; count: number }[];
  dataTestId?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  unit,
  trend = 'stable',
  lowerIsBetter = false,
  trendValue,
  trendLabel,
  icon,
  subtitle,
  failedExecutions,
  dataTestId,
  onClick,
}: MetricCardProps) {
  const trendDirection =
    typeof trend === 'string'
      ? trend
      : trend.length >= 2
        ? ((trend[trend.length - 1].rate ?? trend[trend.length - 1].duration ?? 0) >=
          (trend[0].rate ?? trend[0].duration ?? 0)
            ? 'up'
            : 'down')
        : 'stable';

  const isImproving =
    trendDirection === 'stable'
      ? null
      : lowerIsBetter
        ? trendDirection === 'down'
        : trendDirection === 'up';

  const trendTone = {
    positive: 'success',
    negative: 'error',
    stable: 'info',
  }[isImproving === null ? 'stable' : isImproving ? 'positive' : 'negative'] as
    | 'success'
    | 'error'
    | 'info';

  const trendSymbol = {
    up: lowerIsBetter ? '↓' : '↑',
    down: lowerIsBetter ? '↑' : '↓',
    stable: '→',
  }[trendDirection];

  const toneClasses = {
    positive: 'bg-success-50 text-success-700 border-success-100',
    negative: 'bg-error-50 text-error-700 border-error-100',
    stable: 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] border-[color:var(--border-default)]',
  }[isImproving === null ? 'stable' : isImproving ? 'positive' : 'negative'];

  return (
    <article
      onClick={onClick}
      className={[
        'rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)] transition-[transform,border-color,box-shadow] duration-200',
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[color:var(--border-accent)] hover:shadow-[var(--shadow-primary-day)]' : '',
      ].join(' ')}
      data-testid={dataTestId}
      aria-label={title}
      role="article"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
            {title}
          </p>
          <div className="mt-3 flex items-end gap-2">
            <div
              className="text-2xl font-extrabold leading-none tracking-[-0.04em] text-[color:var(--text-strong)]"
              data-testid={dataTestId ? `${dataTestId}-value` : undefined}
            >
              {value}
            </div>
            {unit && <span className="pb-0.5 text-sm text-[color:var(--text-secondary)]">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${toneClasses}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4">
        <ProgressSegments
          filled={
            trendDirection === 'stable'
              ? 2
              : isImproving
                ? 4
                : 1
          }
          total={4}
          color={
            trendDirection === 'stable'
              ? 'primary'
              : isImproving
                ? 'success'
                : 'error'
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
          {(trendValue || trendLabel) && (
            <Badge tone={trendTone}>
              {trendSymbol} {trendValue || trendLabel}
            </Badge>
          )}
          {subtitle && <p className="text-xs text-[color:var(--text-secondary)]">{subtitle}</p>}
          {failedExecutions && failedExecutions.length > 0 && (
            <p className="text-xs font-medium text-[color:var(--text-secondary)]">
              Top: {failedExecutions[0].automation}
            </p>
          )}
      </div>
    </article>
  );
}

export default MetricCard;
