import React, { useState } from 'react';

interface AlertThreshold {
  rule_id: string;
  rule_name: string;
  failure_rate_threshold: number;
  enabled: boolean;
}

interface AlertConfigurationProps {
  thresholds?: AlertThreshold[];
  onSave?: (thresholds: AlertThreshold[]) => Promise<void>;
  isLoading?: boolean;
}

export const AlertConfiguration: React.FC<AlertConfigurationProps> = ({
  thresholds = [],
  onSave,
  isLoading = false,
}) => {
  const [localThresholds, setLocalThresholds] = useState<AlertThreshold[]>(thresholds);
  const [isSaving, setIsSaving] = useState(false);

  const handleThresholdChange = (ruleId: string, value: number) => {
    setLocalThresholds((prev) =>
      prev.map((t) =>
        t.rule_id === ruleId ? { ...t, failure_rate_threshold: value } : t
      )
    );
  };

  const handleEnabledChange = (ruleId: string) => {
    setLocalThresholds((prev) =>
      prev.map((t) =>
        t.rule_id === ruleId ? { ...t, enabled: !t.enabled } : t
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave?.(localThresholds);
    } catch (error) {
      console.error('Failed to save alert configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-4">Alert Configuration</h2>
      <p className="text-sm text-gray-600 mb-6">
        Set failure rate thresholds for each rule. Alerts will be triggered when the threshold is exceeded (checked every minute).
      </p>

      {thresholds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No rules available for alert configuration.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rule</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Failure Rate Threshold</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {localThresholds.map((threshold) => (
                  <tr key={threshold.rule_id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{threshold.rule_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={threshold.failure_rate_threshold}
                          onChange={(e) =>
                            handleThresholdChange(threshold.rule_id, parseFloat(e.target.value))
                          }
                          disabled={!threshold.enabled}
                          className="w-32 disabled:opacity-50"
                        />
                        <span className="w-16 text-right font-semibold text-gray-900">
                          {threshold.failure_rate_threshold.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={threshold.enabled}
                        onChange={() => handleEnabledChange(threshold.rule_id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Alerts are checked every minute. When a rule's failure rate exceeds the threshold in the last hour, a notification will be sent. There's a 5-minute cooldown between alerts for the same rule to prevent spam.
        </p>
      </div>
    </div>
  );
};
