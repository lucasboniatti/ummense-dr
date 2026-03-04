import React from 'react';
import { FormInput } from './composite/FormField';

interface CronExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function CronExpressionInput({
  value,
  onChange,
  placeholder = '0 0 * * *',
  error,
  disabled = false,
}: CronExpressionInputProps) {
  const cronExamples = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Hourly', value: '0 * * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Weekly (Monday)', value: '0 0 * * 1' },
    { label: 'Monthly', value: '0 0 1 * *' },
  ];

  return (
    <div className="space-y-3">
      <FormInput
        label="Cron Expression"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        error={error}
        hint="Use standard cron syntax (minute hour day month weekday)"
        disabled={disabled}
      />

      <div className="space-y-2">
        <p className="text-xs font-medium text-neutral-600">Quick presets:</p>
        <div className="flex flex-wrap gap-2">
          {cronExamples.map(ex => (
            <button
              key={ex.value}
              type="button"
              onClick={() => onChange(ex.value)}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
