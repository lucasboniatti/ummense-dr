import React from 'react';
import { Badge } from './ui/Badge';
import { ProgressSegments } from './ui/ProgressSegments';

interface KPIData {
  label: string;
  value: string;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
}

interface KPICardsProps {
  data?: KPIData[];
  metrics?: {
    rulesCount?: number;
    webhooksCount?: number;
    eventsProcessed24h?: number;
    successRate?: number;
    avgExecutionTimeMs?: number;
  };
  columns?: 2 | 3 | 4;
}

export function KPICards({ data, metrics, columns = 4 }: KPICardsProps) {
  const normalizedData: KPIData[] =
    data ||
    (metrics
      ? [
          { label: 'Rules', value: String(metrics.rulesCount ?? 0) },
          { label: 'Webhooks', value: String(metrics.webhooksCount ?? 0) },
          {
            label: 'Events (24h)',
            value: String(metrics.eventsProcessed24h ?? 0),
          },
          {
            label: 'Success Rate',
            value: `${(metrics.successRate ?? 0).toFixed(1)}%`,
          },
          {
            label: 'Avg Time',
            value: `${Math.round(metrics.avgExecutionTimeMs ?? 0)}ms`,
          },
        ]
      : []);

  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {normalizedData.map((kpi, idx) => (
        <article
          key={idx}
          className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
            {kpi.label}
          </p>
          <div className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
            {kpi.value}
          </div>
          <div className="mt-3">
            <ProgressSegments
              filled={kpi.trendType === 'up' ? 4 : kpi.trendType === 'down' ? 1 : 2}
              total={4}
              color={kpi.trendType === 'down' ? 'error' : kpi.trendType === 'up' ? 'success' : 'primary'}
            />
          </div>
          {kpi.trend && (
            <div className="mt-3">
              <Badge
                tone={
                  kpi.trendType === 'up'
                    ? 'success'
                    : kpi.trendType === 'down'
                      ? 'error'
                      : 'info'
                }
              >
                {kpi.trendType === 'up' ? '↑' : kpi.trendType === 'down' ? '↓' : '→'} {kpi.trend}
              </Badge>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
