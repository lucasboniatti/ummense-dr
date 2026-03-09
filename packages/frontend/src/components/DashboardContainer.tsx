'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import MetricCard from './MetricCard';
import { CostCard, type CostCardSummary } from './CostCard';

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
  trendLabel: 'Aguardando serie historica',
  lastUpdatedAt: null,
  isEstimate: true,
};

export default function DashboardContainer() {
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  const [metrics, setMetrics] = useState<MetricsResponse>(initialMetrics);
  const [costSummary, setCostSummary] = useState<CostCardSummary>(emptyCostSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError('Nao foi possivel carregar o dashboard. Exibindo os ultimos valores conhecidos.');
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
                Monitore saude de execucao, custo de armazenamento e comportamento do sistema em uma leitura compacta.
              </p>
            </div>

            <div className="app-toolbar-cluster">
              <div className="app-control flex items-center gap-2 rounded-full px-3 py-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    isConnected ? 'bg-success-500' : 'bg-neutral-400'
                  }`}
                />
                <span
                  className="text-sm font-medium text-neutral-700"
                  data-testid="websocket-status"
                >
                  {isConnected ? 'Tempo real ativo' : 'Modo polling'}
                </span>
              </div>

              <button
                onClick={handleExportCSV}
                className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                aria-label="Export dashboard data as CSV"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="app-inline-banner app-inline-banner-warning">
              <strong>Analytics</strong>
              {error}
            </div>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
          <div className="text-neutral-600">Carregando metricas...</div>
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
              icon="✓"
              dataTestId="metric-success-rate"
            />

            <MetricCard
              title="Duracao media"
              value={`${metrics.avgDuration.toFixed(0)}ms`}
              trend={metrics.durationTrend}
              trendLabel="performance"
              icon="⏱"
              dataTestId="metric-avg-duration"
            />

            <MetricCard
              title="Falhas criticas"
              value={`${metrics.failedExecutions.length}`}
              failedExecutions={metrics.failedExecutions}
              icon="✗"
              dataTestId="metric-failed-executions"
            />

            <MetricCard
              title="Volume total"
              value={`${(costSummary.dbStorageGb + costSummary.s3StorageGb).toFixed(2)}GB`}
              subtitle={costSummary.isEstimate ? 'DB + S3 estimado' : 'DB + S3'}
              icon="💾"
              dataTestId="metric-storage-utilization"
            />
          </div>

          <CostCard summary={costSummary} />
        </div>
      )}
    </div>
  );
}
