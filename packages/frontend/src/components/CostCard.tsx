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
  const trendVariant =
    summary.trend === 'down'
      ? 'success'
      : summary.trend === 'up'
        ? 'destructive'
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
    <Card data-testid="cost-card" className="border-neutral-200 shadow-sm">
      <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-lg font-semibold">Cost Monitoring</CardTitle>
          <p className="text-sm text-neutral-600">
            ROI do arquivamento em S3 comparado ao armazenamento no banco.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={trendVariant}>
            {trendSymbol} {summary.trendLabel}
          </Badge>
          <Badge variant="default">Precisao {summary.accuracy}%</Badge>
          {summary.isEstimate && <Badge variant="warning">estimado</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="DB Storage Cost"
            value={`${formatCurrency(summary.dbCost)}/mo`}
            hint={`${summary.dbStorageGb.toFixed(2)} GB no banco`}
          />
          <MetricTile
            label="S3 Archival Cost"
            value={`${formatCurrency(summary.s3Cost)}/mo`}
            hint={`${summary.s3StorageGb.toFixed(2)} GB considerados`}
          />
          <MetricTile
            label="Monthly Savings"
            value={formatCurrency(summary.monthlySavings)}
            hint={summary.monthlySavings >= 0 ? 'economia mensal atual' : 'custo adicional mensal'}
            emphasized={summary.monthlySavings >= 0}
          />
          <MetricTile
            label="7-Year Projection"
            value={formatCurrency(summary.sevenYearProjection)}
            hint="projecao acumulada"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Storage Growth Trend</h3>
                <p className="text-xs text-neutral-600">Media movel de 7 dias do ritmo de arquivamento</p>
              </div>
              <span className="text-xs text-neutral-500">
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
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">Breakdown</h3>
              <span
                className="cursor-help text-xs text-neutral-500 underline decoration-dotted"
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

            <p className="mt-4 text-xs text-neutral-500">
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          emphasized ? 'text-success-700' : 'text-neutral-900'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-neutral-600">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
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
