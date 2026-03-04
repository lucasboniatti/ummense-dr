'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Badge } from './ui/Badge';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  unit,
  trend = 'stable',
  trendValue,
  icon,
  subtitle,
  onClick,
}: MetricCardProps) {
  const trendVariant = {
    up: 'success',
    down: 'error',
    stable: 'default',
  }[trend] as 'success' | 'error' | 'default';

  const trendSymbol = {
    up: '↑',
    down: '↓',
    stable: '→',
  }[trend];

  return (
    <Card onClick={onClick} className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-2xl">{icon}</div>}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {unit && <span className="text-sm text-neutral-600">{unit}</span>}
        </div>
        <div className="flex items-center gap-2">
          {trendValue && (
            <Badge variant={trendVariant}>
              {trendSymbol} {trendValue}
            </Badge>
          )}
          {subtitle && <p className="text-xs text-neutral-600">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
