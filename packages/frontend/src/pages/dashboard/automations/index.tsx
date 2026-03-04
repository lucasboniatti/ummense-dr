import React, { useState, useEffect } from 'react';
import { automationService } from '../../../services/automation.service';
import { KPICards } from '../../../components/KPICards';
import { TimeSeriesChart } from '../../../components/TimeSeriesChart';
import { TopFailingRules } from '../../../components/TopFailingRules';
import { RecentExecutions } from '../../../components/RecentExecutions';
import { LogsSearchInterface } from '../../../components/LogsSearchInterface';

export default function AutomationDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [topRules, setTopRules] = useState<any[]>([]);
  const [recentExecs, setRecentExecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [m, ts, tr, re] = await Promise.all([
        automationService.getMetrics(),
        automationService.getTimeSeries(),
        automationService.getTopFailingRules(10),
        automationService.getRecentExecutions(50),
      ]);
      setMetrics(m);
      setTimeSeries(ts);
      setTopRules(tr);
      setRecentExecs(re);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Automation Dashboard</h1>
        <p className="text-neutral-600 mt-1">Monitor rule performance, execution metrics, and logs</p>
      </div>

      {/* Error */}
      {error && <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded">{error}</div>}

      {/* KPI Cards */}
      {metrics && <KPICards metrics={metrics} />}

      {/* Time Series Chart */}
      {timeSeries.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-xl font-bold mb-4">7-Day Execution Breakdown</h2>
          <TimeSeriesChart data={timeSeries} />
        </div>
      )}

      {/* Top Failing Rules */}
      {topRules.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-xl font-bold mb-4">Top Failing Rules</h2>
          <TopFailingRules rules={topRules} />
        </div>
      )}

      {/* Recent Executions */}
      {recentExecs.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-xl font-bold mb-4">Recent Executions</h2>
          <RecentExecutions executions={recentExecs} />
        </div>
      )}

      {/* Logs Search */}
      <LogsSearchInterface />
    </div>
  );
}
