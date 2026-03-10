'use client';

import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Badge } from './ui/Badge';

export interface CostCardSummary {
  dbCost: number;
  s3Cost: number;
  monthlySavings: number;
  sevenYearProjection: number;
  storageGrowthTrend: Array<{
    date: string;
    archivalRateGbPerDay: number;
  }>;
  accuracy: number;
  dbStorageGb: number;
  s3StorageGb: number;
  archivedStorageGb: number;
  compressionRatio: number;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  lastUpdatedAt: string | null;
  isEstimate: boolean;
}

interface CostCardProps {
  summary: CostCardSummary;
}

export function CostCard({ summary }: CostCardProps) {
  const trendTone =
    summary.trend === 'down'
      ? 'success'
      : summary.trend === 'up'
        ? 'error'
        : 'warning';
  const trendSymbol =
    summary.trend === 'down' ? '↓' : summary.trend === 'up' ? '↑' : '↔';
  const chartData =
    summary.storageGrowthTrend.length > 0
      ? summary.storageGrowthTrend.map((point) => ({
          ...point,
          shortDate: new Date(point.date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
        }))
      : [
          {
            date: new Date().toISOString(),
            shortDate: 'hoje',
            archivalRateGbPerDay: 0,
          },
        ];

  const breakdownLabel = [
    `DB: ${formatCurrency(summary.dbCost)}/mes (${summary.dbStorageGb.toFixed(2)} GB)`,
    `S3: ${formatCurrency(summary.s3Cost)}/mes (${summary.s3StorageGb.toFixed(2)} GB efetivos)`,
    `Arquivado de fato: ${summary.archivedStorageGb.toFixed(2)} GB`,
    `Compressao: ${summary.compressionRatio.toFixed(2)}x`,
    summary.isEstimate ? 'Valores de S3 estimados com base no volume atual.' : 'Valores de S3 medidos a partir dos arquivos arquivados.',
  ].join(' | ');

  return (
    <Card data-testid="cost-card" className="overflow-hidden">
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="app-kicker">Analitico financeiro</p>
          <CardTitle className="text-xl font-semibold">Custo de armazenamento</CardTitle>
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
            Acompanhe o ROI do arquivamento em S3 comparado ao volume mantido no banco.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={trendTone}>
            {trendSymbol} {summary.trendLabel}
          </Badge>
          <Badge tone="info">Precisao {summary.accuracy}%</Badge>
          {summary.isEstimate && <Badge tone="warning">estimado</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Banco"
            value={`${formatCurrency(summary.dbCost)}/mes`}
            hint={`${summary.dbStorageGb.toFixed(2)} GB mantidos no banco`}
          />
          <MetricTile
            label="S3"
            value={`${formatCurrency(summary.s3Cost)}/mes`}
            hint={`${summary.s3StorageGb.toFixed(2)} GB considerados`}
          />
          <MetricTile
            label="Economia mensal"
            value={formatCurrency(summary.monthlySavings)}
            hint={summary.monthlySavings >= 0 ? 'economia mensal atual' : 'custo adicional mensal'}
            emphasized={summary.monthlySavings >= 0}
          />
          <MetricTile
            label="Projecao em 7 anos"
            value={formatCurrency(summary.sevenYearProjection)}
            hint="projecao acumulada"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
          <div className="app-surface-muted rounded-[22px] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[color:var(--text-strong)]">Ritmo de arquivamento</h3>
                <p className="text-xs text-[color:var(--text-secondary)]">Media movel de 7 dias da taxa de arquivamento</p>
              </div>
              <span className="text-xs text-[color:var(--text-muted)]">
                {summary.lastUpdatedAt
                  ? `Atualizado em ${new Date(summary.lastUpdatedAt).toLocaleString('pt-BR')}`
                  : 'Snapshot ao vivo'}
              </span>
            </div>

            <div className="h-44" data-testid="cost-card-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="shortDate" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={48}
                    tickFormatter={(value) => `${value}GB`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${Number(value).toFixed(3)} GB/dia`, 'Taxa']}
                    labelFormatter={(value) => `Dia ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="archivalRateGbPerDay"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="app-section-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[color:var(--text-strong)]">Quebra de volume</h3>
              <span
                className="cursor-help text-xs text-[color:var(--text-muted)] underline decoration-dotted"
                title={breakdownLabel}
                aria-label={breakdownLabel}
              >
                detalhes
              </span>
            </div>

            <dl className="space-y-3 text-sm">
              <BreakdownRow label="DB storage" value={`${summary.dbStorageGb.toFixed(2)} GB`} />
              <BreakdownRow label="S3 storage" value={`${summary.s3StorageGb.toFixed(2)} GB`} />
              <BreakdownRow
                label="Archive bytes reais"
                value={`${summary.archivedStorageGb.toFixed(2)} GB`}
              />
              <BreakdownRow
                label="Compression ratio"
                value={`${summary.compressionRatio.toFixed(2)}x`}
              />
              <BreakdownRow label="Accuracy" value={`${summary.accuracy}%`} />
            </dl>

            <p className="mt-4 text-xs text-[color:var(--text-muted)]">
              {summary.isEstimate
                ? 'Sem volume arquivado suficiente para leitura real do bucket; exibindo custo potencial com a compressao configurada.'
                : 'Custos de S3 calculados com base nos objetos arquivados disponiveis no bucket configurado.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  hint,
  emphasized = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">{label}</p>
      <p
        className={`mt-2 text-2xl font-extrabold tracking-[-0.04em] ${
          emphasized ? 'text-success-700' : 'text-[color:var(--text-strong)]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{hint}</p>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[color:var(--text-secondary)]">{label}</dt>
      <dd className="font-medium text-[color:var(--text-strong)]">{value}</dd>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}
