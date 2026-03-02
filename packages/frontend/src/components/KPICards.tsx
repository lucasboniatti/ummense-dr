import React from 'react';

interface KPICardsProps {
  metrics: {
    rulesCount: number;
    webhooksCount: number;
    eventsProcessed24h: number;
    successRate: number;
    avgExecutionTimeMs: number;
  };
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Total Rules */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-600">Total Rules</p>
        <p className="text-3xl font-bold mt-2">{metrics.rulesCount}</p>
      </div>

      {/* Total Webhooks */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-600">Total Webhooks</p>
        <p className="text-3xl font-bold mt-2">{metrics.webhooksCount}</p>
      </div>

      {/* Events Processed (24h) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-600">Events (24h)</p>
        <p className="text-3xl font-bold mt-2">{metrics.eventsProcessed24h}</p>
      </div>

      {/* Success Rate */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-600">Success Rate</p>
        <p className="text-3xl font-bold mt-2">{metrics.successRate.toFixed(1)}%</p>
      </div>

      {/* Avg Execution Time */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-600">Avg Time</p>
        <p className="text-3xl font-bold mt-2">{metrics.avgExecutionTimeMs.toFixed(0)}ms</p>
      </div>
    </div>
  );
};
