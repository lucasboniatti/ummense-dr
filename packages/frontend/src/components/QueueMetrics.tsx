import React, { useState, useEffect } from 'react';
import { controlService, QueueMetrics } from '../services/control.service';

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
        const interval = setInterval(fetchMetrics, 5000); // Polling every 5s for simplicity
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Loading queue metrics...</div>;
    if (error) return <div className="text-red-500">Error loading metrics: {error}</div>;
    if (!metrics) return null;

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center justify-between">
                Queue Metrics
                {metrics.isPaused && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">PAUSED</span>
                )}
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-600 font-medium">Active (Local)</p>
                    <p className="text-2xl font-bold">{metrics.activeCount}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm text-purple-600 font-medium">Waiting</p>
                    <p className="text-2xl font-bold">{metrics.waitingCount}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                    <p className="text-sm text-orange-600 font-medium">Delayed</p>
                    <p className="text-2xl font-bold">{metrics.delayedCount}</p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                    <p className="text-sm text-red-600 font-medium">Failed</p>
                    <p className="text-2xl font-bold">{metrics.failedCount}</p>
                </div>
            </div>

            <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                    Capacity ({metrics.percentFull}%)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className={`h-2.5 rounded-full ${metrics.percentFull > 80 ? 'bg-red-500' :
                                metrics.percentFull > 50 ? 'bg-yellow-400' : 'bg-green-500'
                            }`}
                        style={{ width: `${Math.min(100, Math.max(0, metrics.percentFull))}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                    Global active executions: {metrics.systemActiveExecutions}
                </p>
            </div>
        </div>
    );
};
