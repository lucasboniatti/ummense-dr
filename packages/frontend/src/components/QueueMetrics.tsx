import React, { useState, useEffect } from 'react';
import { controlService, QueueMetrics } from '../services/control.service';
import { Badge } from './ui/Badge';

export const QueueMetricsDisplay: React.FC = () => {
    const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            const data = await controlService.fetchQueueStatus();
            setMetrics(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="app-surface-muted rounded-[22px] p-4 text-neutral-600">Loading queue metrics...</div>;
    if (error) return <div className="app-inline-banner app-inline-banner-error"><strong>Queue</strong>Error loading metrics: {error}</div>;
    if (!metrics) return null;

    const getCapacityVariant = (percentFull: number) => {
        if (percentFull > 80) return 'destructive';
        if (percentFull > 50) return 'warning';
        return 'success';
    };

    const getCapacityColor = (percentFull: number) => {
        if (percentFull > 80) return 'bg-error-500';
        if (percentFull > 50) return 'bg-warning-500';
        return 'bg-success-500';
    };

    return (
        <div className="app-surface p-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="app-kicker">Fila</p>
                    <h3 className="mt-2 text-lg font-semibold text-neutral-900">Queue metrics</h3>
                </div>
                {metrics.isPaused && (
                    <Badge variant="warning">PAUSED</Badge>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="app-surface-muted rounded-[18px] p-3">
                    <p className="text-sm text-primary-600 font-medium">Active (Local)</p>
                    <p className="text-2xl font-bold text-neutral-900">{metrics.activeCount}</p>
                </div>
                <div className="app-surface-muted rounded-[18px] p-3">
                    <p className="text-sm text-neutral-600 font-medium">Waiting</p>
                    <p className="text-2xl font-bold text-neutral-900">{metrics.waitingCount}</p>
                </div>
                <div className="app-surface-muted rounded-[18px] p-3">
                    <p className="text-sm text-warning-600 font-medium">Delayed</p>
                    <p className="text-2xl font-bold text-neutral-900">{metrics.delayedCount}</p>
                </div>
                <div className="app-surface-muted rounded-[18px] p-3">
                    <p className="text-sm text-error-600 font-medium">Failed</p>
                    <p className="text-2xl font-bold text-neutral-900">{metrics.failedCount}</p>
                </div>
            </div>

            <div className="mt-4">
                <p className="text-sm font-medium text-neutral-700 mb-2">
                    Capacity ({metrics.percentFull}%)
                </p>
                <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                        className={`h-2.5 rounded-full transition-all ${getCapacityColor(metrics.percentFull)}`}
                        style={{ width: `${Math.min(100, Math.max(0, metrics.percentFull))}%` }}
                    />
                </div>
                <p className="text-xs text-neutral-500 mt-2 text-right">
                    Global active executions: {metrics.systemActiveExecutions}
                </p>
            </div>
        </div>
    );
};
