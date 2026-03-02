import React from 'react';

interface Rule {
  rule_id: string;
  name: string;
  failures: number;
  successes: number;
  failureRate: number;
  lastFailure: string;
}

interface TopFailingRulesProps {
  rules: Rule[];
}

export const TopFailingRules: React.FC<TopFailingRulesProps> = ({ rules }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rule</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Failures (24h)</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Failure Rate</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Failure</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.rule_id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">{rule.name}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{rule.failures}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(rule.failureRate, 100)}%` }}
                    />
                  </div>
                  <span className="text-red-600 font-semibold">{rule.failureRate.toFixed(1)}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(rule.lastFailure).toLocaleDateString()} {new Date(rule.lastFailure).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
