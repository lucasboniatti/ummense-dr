import React, { useState } from 'react';

interface ScheduleToggleControlProps {
  automationId: string;
  scheduleName: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  nextExecutionAt?: string;
  lastExecutionAt?: string;
  onToggle: (automationId: string, enabled: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const ScheduleToggleControl: React.FC<ScheduleToggleControlProps> = ({
  automationId,
  scheduleName,
  cronExpression,
  timezone,
  enabled,
  nextExecutionAt,
  lastExecutionAt,
  onToggle,
  isLoading = false,
}) => {
  const [isTogglingLocally, setIsTogglingLocally] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsTogglingLocally(true);
      await onToggle(automationId, e.target.checked);
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      // Revert the toggle on error
      e.target.checked = enabled;
    } finally {
      setIsTogglingLocally(false);
    }
  };

  const isLoading$ = isLoading || isTogglingLocally;

  return (
    <div
      className={`flex items-center justify-between p-4 border border-neutral-200 rounded-lg ${
        enabled ? 'bg-white' : 'bg-neutral-50'
      }`}
    >
      {/* Schedule Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h3 className={`text-sm font-semibold ${enabled ? 'text-neutral-900' : 'text-neutral-500'}`}>
            {scheduleName}
          </h3>
          <span className="inline-block px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 rounded">
            {cronExpression}
          </span>
        </div>

        {/* Timezone */}
        <p className={`text-xs ${enabled ? 'text-neutral-600' : 'text-neutral-400'}`}>
          Timezone: <span className="font-mono">{timezone}</span>
        </p>

        {/* Execution Times */}
        <div className="mt-2 space-y-1 text-xs text-neutral-500">
          {nextExecutionAt && (
            <p>
              Next execution:{' '}
              <span className={enabled ? 'text-neutral-700 font-medium' : 'text-neutral-400'}>
                {new Date(nextExecutionAt).toLocaleString()}
              </span>
            </p>
          )}
          {lastExecutionAt && (
            <p>
              Last execution: <span className="text-neutral-600">{new Date(lastExecutionAt).toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="flex-shrink-0 ml-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs font-medium text-neutral-700">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={isLoading$}
            className={`w-5 h-5 rounded border-neutral-300 text-success-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {isLoading$ && (
            <span className="text-xs text-neutral-400">
              <svg className="inline w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </span>
          )}
        </label>

        {/* Disabled Indicator */}
        {!enabled && (
          <div className="mt-2 text-xs text-warning-600 bg-warning-50 px-2 py-1 rounded border border-warning-200">
            Schedule paused
          </div>
        )}
      </div>
    </div>
  );
};
