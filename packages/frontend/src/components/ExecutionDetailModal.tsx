import React from 'react';

interface ExecutionTrace {
  rule_id: string;
  rule_name: string;
  webhook_id: string;
  webhook_url: string;
  triggered_at: string;
  status: 'success' | 'failed' | 'pending';
  execution_time_ms: number;
  rule_config?: Record<string, any>;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  error_trace?: string;
  retry_history?: Array<{
    attempt: number;
    status: string;
    timestamp: string;
    error?: string;
  }>;
}

interface ExecutionDetailModalProps {
  execution: ExecutionTrace;
  onClose?: () => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-50';
    case 'failed':
      return 'text-red-600 bg-red-50';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const ExecutionDetailModal: React.FC<ExecutionDetailModalProps> = ({ execution, onClose }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-6 rounded-lg border ${getStatusColor(execution.status)}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{execution.rule_name}</h2>
            <p className="text-sm mt-1 opacity-75">Execution ID: {execution.execution_id || 'N/A'}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 text-2xl"
            >
              ✕
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs opacity-75">Status</p>
            <p className="text-lg font-semibold capitalize">{execution.status}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">Duration</p>
            <p className="text-lg font-semibold">{execution.execution_time_ms}ms</p>
          </div>
          <div>
            <p className="text-xs opacity-75">Triggered</p>
            <p className="text-sm">{new Date(execution.triggered_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">Webhook</p>
            <p className="text-sm truncate">{execution.webhook_url}</p>
          </div>
        </div>
      </div>

      {/* Rule Config */}
      {execution.rule_config && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Rule Configuration</h3>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-48">
            {JSON.stringify(execution.rule_config, null, 2)}
          </pre>
        </div>
      )}

      {/* Conditions */}
      {execution.conditions && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Conditions Evaluated</h3>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-48">
            {JSON.stringify(execution.conditions, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions Taken */}
      {execution.actions && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Actions Executed</h3>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-48">
            {JSON.stringify(execution.actions, null, 2)}
          </pre>
        </div>
      )}

      {/* Error Trace */}
      {execution.error_trace && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4">Error Details</h3>
          <pre className="bg-white p-4 rounded-lg text-sm text-red-800 overflow-auto max-h-48">
            {execution.error_trace}
          </pre>
        </div>
      )}

      {/* Retry History */}
      {execution.retry_history && execution.retry_history.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Retry History</h3>
          <div className="space-y-3">
            {execution.retry_history.map((attempt, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Attempt {attempt.attempt}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    attempt.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {attempt.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{new Date(attempt.timestamp).toLocaleString()}</p>
                {attempt.error && (
                  <p className="text-sm text-red-600 mt-2">{attempt.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
