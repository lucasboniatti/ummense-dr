'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Database } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import MetricCard from './MetricCard';
import { CostCard, type CostCardSummary } from './CostCard';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ProgressSegments } from './ui/ProgressSegments';

interface MetricsResponse {
  successRate: number;
  avgDuration: number;
  failedExecutions: { automation: string; count: number }[];
  costSavings: number;
  storageUtilization: number;
  successTrend: { date: string; rate: number }[];
  durationTrend: { date: string; duration: number }[];
}

const initialMetrics: MetricsResponse = {
  successRate: 0,
  avgDuration: 0,
  failedExecutions: [],
  costSavings: 0,
  storageUtilization: 0,
  successTrend: [],
  durationTrend: [],
};

const emptyCostSummary: CostCardSummary = {
  dbCost: 0,
  s3Cost: 0,
  monthlySavings: 0,
  sevenYearProjection: 0,
  storageGrowthTrend: [],
  accuracy: 95,
  dbStorageGb: 0,
  s3StorageGb: 0,
  archivedStorageGb: 0,
  compressionRatio: 3.5,
  trend: 'stable',
  trendLabel: 'Aguardando série histórica',
  lastUpdatedAt: null,
  isEstimate: true,
};

export default function DashboardContainer() {
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  const [metrics, setMetrics] = useState<MetricsResponse>(initialMetrics);
  const [costSummary, setCostSummary] = useState<CostCardSummary>(emptyCostSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const criticalFailures = metrics.failedExecutions.reduce((acc, current) => acc + current.count, 0);
  const totalStorage = costSummary.dbStorageGb + costSummary.s3StorageGb;
  const healthTone =
    metrics.successRate >= 95 ? 'success' : metrics.successRate >= 80 ? 'info' : 'warning';
  const healthCopy =
    criticalFailures > 0
      ? 'Existem automações exigindo atenção prioritária nesta janela.'
      : 'Sem anomalias críticas detectadas no snapshot atual.';

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [metricsResponse, costResponse] = await Promise.all([
        fetch('/api/analytics/metrics', {
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch('/api/analytics/cost-summary', {
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      if (!metricsResponse.ok) {
        throw new Error(`Metrics API error: ${metricsResponse.statusText}`);
      }

      if (!costResponse.ok) {
        throw new Error(`Cost summary API error: ${costResponse.statusText}`);
      }

      const [metricsPayload, costPayload] = await Promise.all([
        metricsResponse.json(),
        costResponse.json(),
      ]);

      setMetrics(metricsPayload);
      setCostSummary(costPayload);
      setError(null);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch dashboard data:', err);
      setError('Não foi possível carregar o dashboard. Exibindo os últimos valores conhecidos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!isConnected) {
      const pollInterval = setInterval(() => {
        void fetchDashboardData();
      }, 10000);

      return () => clearInterval(pollInterval);
    }

    subscribe('execution-updates');

    const handleUpdate = () => {
      void fetchDashboardData();
    };

    window.addEventListener('websocket:execution-update', handleUpdate);

    return () => {
      window.removeEventListener('websocket:execution-update', handleUpdate);
      unsubscribe('execution-updates');
    };
  }, [fetchDashboardData, isConnected, subscribe, unsubscribe]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Date',
      'Success Rate (%)',
      'Avg Duration (ms)',
      'Storage (GB)',
      'Monthly Savings (USD)',
    ];

    const rows = (metrics.successTrend.length > 0 ? metrics.successTrend : [{ date: new Date().toISOString(), rate: metrics.successRate }]).map(
      (point, idx) => [
        point.date,
        metrics.successTrend[idx]?.rate ?? metrics.successRate,
        metrics.durationTrend[idx]?.duration ?? metrics.avgDuration,
        costSummary.dbStorageGb + costSummary.s3StorageGb,
        costSummary.monthlySavings,
      ]
    );

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [costSummary, metrics]);

  return (
    <div className="app-page" data-testid="dashboard-container">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-hero-grid">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="app-page-heading">
              <p className="app-kicker">Analytics</p>
              <h1 className="app-page-title">Indicadores operacionais</h1>
              <p className="app-page-copy">
                Monitore saúde de execução, custo de armazenamento e comportamento do sistema em uma leitura compacta.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={isConnected ? 'success' : 'neutral'}>
                  {isConnected ? 'Tempo real ativo' : 'Atualização periódica'}
                </Badge>
                <Badge tone="info">Taxa de sucesso {metrics.successRate.toFixed(1)}%</Badge>
                <Badge tone={metrics.failedExecutions.length > 0 ? 'warning' : 'success'}>
                  {metrics.failedExecutions.length} falhas críticas
                </Badge>
              </div>
            </div>

            <div className="app-toolbar-cluster">
              <div className="app-note-card min-w-[280px]">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  <span>Saúde geral</span>
                  <span data-testid="websocket-status">{isConnected ? 'Online' : 'Fallback'}</span>
                </div>
                <ProgressSegments
                  filled={metrics.successRate >= 95 ? 4 : metrics.successRate >= 75 ? 3 : metrics.successRate >= 50 ? 2 : 1}
                  total={4}
                  color={metrics.successRate >= 95 ? 'success' : metrics.successRate >= 75 ? 'primary' : 'warning'}
                />
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
                  {healthCopy}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={healthTone}>saúde {metrics.successRate.toFixed(1)}%</Badge>
                  <Badge tone={criticalFailures > 0 ? 'warning' : 'success'}>
                    {criticalFailures} alertas
                  </Badge>
                </div>
              </div>

              <Button
                onClick={handleExportCSV}
                variant="primary"
                aria-label="Export dashboard data as CSV"
              >
                Exportar CSV
              </Button>
            </div>
          </div>

          {error && (
            <div className="app-inline-banner app-inline-banner-warning rounded-xl">
              <strong>Analytics</strong>
              {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Saúde de execução
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {metrics.successRate.toFixed(1)}%
                </p>
                <Badge tone={healthTone}>ao vivo</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                taxa de sucesso consolidada na vista atual
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Duração média
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {metrics.avgDuration.toFixed(0)}
                </p>
                <Badge tone="info">ms</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                tempo médio para concluir as execuções
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Custo evitado
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(costSummary.monthlySavings)}
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                economia mensal estimada com a estratégia atual
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Volume observado
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {totalStorage.toFixed(1)}
                </p>
                <Badge tone="neutral">GB</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                base combinada entre banco e S3
              </p>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="app-surface-muted flex h-64 items-center justify-center rounded-xl" data-testid="dashboard-loading">
          <div className="text-[color:var(--text-secondary)]">Carregando métricas...</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6"
            data-testid="metrics-grid"
          >
            <MetricCard
              title="Taxa de sucesso"
              value={`${metrics.successRate.toFixed(1)}%`}
              trend={metrics.successTrend}
              trendLabel="tendencia"
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              dataTestId="metric-success-rate"
            />

            <MetricCard
              title="Duracao media"
              value={`${metrics.avgDuration.toFixed(0)}ms`}
              trend={metrics.durationTrend}
              lowerIsBetter
              trendLabel="performance"
              icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
              dataTestId="metric-avg-duration"
            />

            <MetricCard
              title="Falhas criticas"
              value={`${metrics.failedExecutions.length}`}
              failedExecutions={metrics.failedExecutions}
              icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
              dataTestId="metric-failed-executions"
            />

            <MetricCard
              title="Volume total"
              value={`${(costSummary.dbStorageGb + costSummary.s3StorageGb).toFixed(2)}GB`}
              subtitle={costSummary.isEstimate ? 'DB + S3 estimado' : 'DB + S3'}
              icon={<Database className="h-5 w-5" aria-hidden="true" />}
              dataTestId="metric-storage-utilization"
            />
          </div>

          <CostCard summary={costSummary} />
        </div>
      )}
    </div>
  );
}
