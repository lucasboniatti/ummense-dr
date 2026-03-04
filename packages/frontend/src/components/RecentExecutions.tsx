import React from 'react';
import Link from 'next/link';

interface Execution {
  execution_id: string;
  rule_id: string;
  rule_name: string;
  webhook_id?: string;
  status: 'success' | 'failed' | 'pending';
  triggered_at: string;
  execution_time_ms: number;
  error_message?: string;
}

interface RecentExecutionsProps {
  executions: Execution[];
}

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-warning-800';
    default:
      return 'bg-neutral-100 text-neutral-800';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'success':
      return '✓ Success';
    case 'failed':
      return '✗ Failed';
    case 'pending':
      return '⋯ Pending';
    default:
      return status;
  }
};

export const RecentExecutions: React.FC<RecentExecutionsProps> = ({ executions }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Rule</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Duration</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Time</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Details</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((execution) => (
            <tr key={execution.execution_id} className="border-b border-neutral-200 hover:bg-neutral-50">
              <td className="px-4 py-3 text-sm font-medium text-neutral-900">{execution.rule_name}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(execution.status)}`}>
                  {getStatusLabel(execution.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">{execution.execution_time_ms}ms</td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {new Date(execution.triggered_at).toLocaleDateString()} {new Date(execution.triggered_at).toLocaleTimeString()}
              </td>
              <td className="px-4 py-3 text-sm">
                <Link href={`/dashboard/automations/${execution.execution_id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
