'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Badge } from './ui/Badge';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable' | { date: string; rate?: number; duration?: number }[];
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

  const trendVariant = {
    up: 'success',
    down: 'destructive',
    stable: 'default',
  }[trendDirection] as 'success' | 'destructive' | 'default';

  const trendSymbol = {
    up: '↑',
    down: '↓',
    stable: '→',
  }[trendDirection];

  return (
    <Card
      onClick={onClick}
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      data-testid={dataTestId}
      aria-label={title}
      role="article"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-2xl">{icon}</div>}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold" data-testid={dataTestId ? `${dataTestId}-value` : undefined}>
            {value}
          </div>
          {unit && <span className="text-sm text-neutral-600">{unit}</span>}
        </div>
        <div className="flex items-center gap-2">
          {(trendValue || trendLabel) && (
            <Badge variant={trendVariant}>
              {trendSymbol} {trendValue || trendLabel}
            </Badge>
          )}
          {subtitle && <p className="text-xs text-neutral-600">{subtitle}</p>}
          {failedExecutions && failedExecutions.length > 0 && (
            <p className="text-xs text-neutral-600">
              Top: {failedExecutions[0].automation}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
