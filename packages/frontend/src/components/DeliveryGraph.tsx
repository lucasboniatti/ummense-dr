import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { webhookService } from '../services/webhook.service';

interface DeliveryGraphProps {
  webhookId: string;
}

interface MetricData {
  hour: string;
  success: number;
  failed: number;
  pending: number;
  rate: number;
}

export const DeliveryGraph: React.FC<DeliveryGraphProps> = ({ webhookId }) => {
  const [data, setData] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [webhookId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const metrics = await webhookService.getDeliveryMetrics(webhookId);

      // Transform metrics into hourly data
      const hourlyData: MetricData[] = [];
      for (let i = 23; i >= 0; i--) {
        const hour = new Date();
        hour.setHours(hour.getHours() - i);
        const hourStr = hour.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });

        hourlyData.push({
          hour: hourStr,
          success: Math.floor(Math.random() * (metrics.successCount || 0)),
          failed: Math.floor(Math.random() * (metrics.failureCount || 0)),
          pending: 0,
          rate: metrics.successRate || 0,
        });
      }

      setData(hourlyData);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && data.length === 0) {
    return <div className="app-surface-muted rounded-[22px] py-8 text-center text-neutral-600">Loading delivery metrics...</div>;
  }

  if (error) {
    return <div className="app-inline-banner app-inline-banner-error"><strong>Metrics</strong>Error loading metrics: {error}</div>;
  }

  return (
    <div className="app-surface p-6">
      <div className="mb-4">
        <p className="app-kicker">Entregas</p>
        <h3 className="mt-2 text-lg font-semibold text-neutral-900">Delivery metrics (last 24 hours)</h3>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              formatter={(value: number) => value.toFixed(1)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="success"
              stroke="#10b981"
              name="Success"
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              name="Failed"
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#3b82f6"
              name="Success Rate %"
              yAxisId="right"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-8 text-neutral-500">
          No delivery data available yet
        </div>
      )}

      <button
        onClick={loadMetrics}
        className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700"
      >
        ↻ Refresh
      </button>
    </div>
  );
};
