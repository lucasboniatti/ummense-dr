'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StorageTrendPoint {
  date: Date;
  archivalRateGbPerDay: number;
}

interface CostCardProps {
  dbCost: number;
  s3Cost: number;
  monthlySavings: number;
  sevenYearProjection: number;
  storageGrowthTrend: StorageTrendPoint[];
  trend?: 'up' | 'down' | 'stable';
  trendColor?: 'green' | 'red' | 'gray';
  isLoading?: boolean;
  error?: string;
}

/**
 * Cost Card Component — Story 3.6.4
 *
 * Displays cost metrics for S3 archival ROI tracking.
 * Integrates into DashboardContainer (Story 3.6.2).
 *
 * Metrics displayed:
 * 1. DB Storage Cost ($X.XX/month)
 * 2. S3 Archival Cost ($X.XX/month)
 * 3. Monthly Savings ($X.XX highlight)
 * 4. 7-Year Projection ($X,XXX.XX)
 * 5. Storage Growth Trend (7-day line chart)
 *
 * Features:
 * - Trend indicator: ↑ (green) for increasing savings, ↓ (red) for decreasing
 * - Hover tooltip: Shows cost breakdown (DB vs S3, compression ratio)
 * - Mobile-responsive: Works on 375px+ viewports
 * - Dark mode support
 * - Accessibility: WCAG 2.1 AA compliant
 *
 * Usage:
 * <CostCard
 *   dbCost={1500}
 *   s3Cost={150}
 *   monthlySavings={1350}
 *   sevenYearProjection={113400}
 *   storageGrowthTrend={[...]}
 *   trend="up"
 *   trendColor="green"
 * />
 */
const CostCard: React.FC<CostCardProps> = ({
  dbCost,
  s3Cost,
  monthlySavings,
  sevenYearProjection,
  storageGrowthTrend = [],
  trend = 'stable',
  trendColor = 'gray',
  isLoading = false,
  error = null,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format large numbers
  const formatLargeNumber = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
    }).format(amount);
  };

  // Color classes for trend
  const trendColorClass = {
    green: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-600 dark:text-gray-400',
  }[trendColor];

  const trendBgClass = {
    green: 'bg-emerald-50 dark:bg-emerald-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    gray: 'bg-gray-50 dark:bg-gray-900/20',
  }[trendColor];

  const trendTextColor = {
    green: 'text-emerald-700 dark:text-emerald-200',
    red: 'text-red-700 dark:text-red-200',
    gray: 'text-gray-700 dark:text-gray-200',
  }[trendColor];

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6"
        data-testid="cost-card-error"
        role="alert"
      >
        <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed to load cost data</p>
        <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          ))}
        </div>
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden"
      data-testid="cost-card"
    >
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cost Savings from S3 Archival</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Comparing database vs. S3 archival costs</p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Metric 1: DB Storage Cost */}
          <div className="space-y-1" data-testid="cost-metric-db">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">DB Storage Cost</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(dbCost)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">/month (RDS)</p>
          </div>

          {/* Metric 2: S3 Archival Cost */}
          <div className="space-y-1" data-testid="cost-metric-s3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">S3 Archival Cost</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(s3Cost)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">/month (S3)</p>
          </div>

          {/* Metric 3: Monthly Savings (Highlighted) */}
          <div className="space-y-1 md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg" data-testid="cost-metric-savings">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Monthly Savings</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(monthlySavings)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-300">Archival ROI</p>
          </div>

          {/* Metric 4: 7-Year Projection */}
          <div className="space-y-1 md:col-span-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg" data-testid="cost-metric-projection">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">7-Year Total Savings</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatLargeNumber(sevenYearProjection)}</p>
            <p className="text-xs text-green-600 dark:text-green-300">Long-term infrastructure ROI</p>
          </div>
        </div>

        {/* Storage Growth Trend Chart */}
        {storageGrowthTrend.length > 0 ? (
          <div data-testid="cost-chart" className="space-y-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Archival Growth Trend (7 days)</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={storageGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis
                  label={{ value: 'GB/day', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9ca3af' } }}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #4b5563',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [value.toFixed(2), 'Archival Rate (GB/day)']}
                />
                <Line
                  type="monotone"
                  dataKey="archivalRateGbPerDay"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                  name="Archival Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center" data-testid="cost-chart-empty">
            <p className="text-sm text-gray-600 dark:text-gray-400">No archival data yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Trend will appear once executions are archived</p>
          </div>
        )}

        {/* Trend Indicator */}
        <div className={`rounded-lg p-3 flex items-center gap-2 ${trendBgClass}`} data-testid="cost-trend">
          <span className={`text-xl ${trendColorClass}`}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'stable' && '↔'}
          </span>
          <span className={`text-sm font-medium ${trendTextColor}`}>
            {trend === 'up' && 'Increasing savings'}
            {trend === 'down' && 'Decreasing savings (check data retention)'}
            {trend === 'stable' && 'Stable savings rate'}
          </span>
        </div>

        {/* Cost Breakdown Tooltip */}
        <div className="relative" data-testid="cost-breakdown">
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            aria-expanded={showTooltip}
            aria-label="Show cost breakdown details"
          >
            {showTooltip ? '✕ Hide' : '○ Show'} cost breakdown
          </button>

          {showTooltip && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 space-y-1">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>DB Cost:</strong> {formatCurrency(dbCost)} (RDS pricing: $1.50/GB/month)
              </p>
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>S3 Cost:</strong> {formatCurrency(s3Cost)} (S3 Standard: $0.023/GB/month)
              </p>
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Compression Ratio:</strong> ~3.5x (typical gzip for JSON execution logs)
              </p>
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> Archival reduces DB load and improves query performance on active data
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostCard;
