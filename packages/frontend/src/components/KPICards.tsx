import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Badge } from './ui/Badge';

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
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{kpi.value}</div>
            {kpi.trend && (
              <Badge
                variant={
                  kpi.trendType === 'up'
                    ? 'success'
                    : kpi.trendType === 'down'
                      ? 'destructive'
                      : 'default'
                }
              >
                {kpi.trendType === 'up' ? '↑' : kpi.trendType === 'down' ? '↓' : '→'} {kpi.trend}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
