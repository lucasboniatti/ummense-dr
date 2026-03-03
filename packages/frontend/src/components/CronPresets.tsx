/**
 * CronPresets Component
 * Story 3.3: Scheduled Automations & Cron Support
 *
 * Quick preset selector for common cron expressions
 */

import React from 'react';

export interface CronPreset {
  label: string;
  value: string;
  description: string;
  category: 'every' | 'daily' | 'weekly' | 'monthly' | 'custom';
}

const CRON_PRESETS: CronPreset[] = [
  // Every X minutes
  {
    label: 'Every minute',
    value: '* * * * *',
    description: 'Execute every minute',
    category: 'every'
  },
  {
    label: 'Every 5 minutes',
    value: '*/5 * * * *',
    description: 'Execute every 5 minutes',
    category: 'every'
  },
  {
    label: 'Every 15 minutes',
    value: '*/15 * * * *',
    description: 'Execute every 15 minutes',
    category: 'every'
  },
  {
    label: 'Every 30 minutes',
    value: '*/30 * * * *',
    description: 'Execute every 30 minutes',
    category: 'every'
  },
  {
    label: 'Every hour',
    value: '0 * * * *',
    description: 'Execute at the beginning of each hour',
    category: 'every'
  },

  // Daily
  {
    label: 'Daily at 9:00 AM',
    value: '0 9 * * *',
    description: 'Execute every day at 9:00 AM',
    category: 'daily'
  },
  {
    label: 'Daily at noon',
    value: '0 12 * * *',
    description: 'Execute every day at 12:00 PM',
    category: 'daily'
  },
  {
    label: 'Daily at 6:00 PM',
    value: '0 18 * * *',
    description: 'Execute every day at 6:00 PM',
    category: 'daily'
  },
  {
    label: 'Daily at midnight',
    value: '0 0 * * *',
    description: 'Execute every day at 12:00 AM',
    category: 'daily'
  },

  // Weekly
  {
    label: 'Every Monday at 9:00 AM',
    value: '0 9 * * 1',
    description: 'Execute every Monday at 9:00 AM',
    category: 'weekly'
  },
  {
    label: 'Every Friday at 5:00 PM',
    value: '0 17 * * 5',
    description: 'Execute every Friday at 5:00 PM',
    category: 'weekly'
  },
  {
    label: 'Weekdays at 9:00 AM',
    value: '0 9 * * 1-5',
    description: 'Execute Monday to Friday at 9:00 AM',
    category: 'weekly'
  },
  {
    label: 'Weekends at 10:00 AM',
    value: '0 10 * * 0,6',
    description: 'Execute Saturday and Sunday at 10:00 AM',
    category: 'weekly'
  },

  // Monthly
  {
    label: 'First day of month',
    value: '0 0 1 * *',
    description: 'Execute on the 1st day of each month at midnight',
    category: 'monthly'
  },
  {
    label: 'Last day of month',
    value: '0 0 L * *',
    description: 'Execute on the last day of each month at midnight',
    category: 'monthly'
  },
  {
    label: 'Mid-month (15th)',
    value: '0 0 15 * *',
    description: 'Execute on the 15th of each month at midnight',
    category: 'monthly'
  }
];

interface CronPresetsProps {
  onSelect: (cronExpression: string) => void;
  selectedValue?: string;
  disabled?: boolean;
}

export const CronPresets: React.FC<CronPresetsProps> = ({
  onSelect,
  selectedValue,
  disabled = false
}) => {
  const categories = Array.from(new Set(CRON_PRESETS.map(p => p.category)));

  const getCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      every: 'Every X Minutes/Hours',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      custom: 'Custom'
    };
    return labels[category] || category;
  };

  const handleSelect = (preset: CronPreset) => {
    onSelect(preset.value);
  };

  return (
    <div className="cron-presets">
      <p className="presets-label">Quick Presets:</p>

      {categories.map(category => (
        <div key={category} className="preset-category">
          <h4 className="category-title">{getCategoryLabel(category)}</h4>
          <div className="preset-buttons">
            {CRON_PRESETS.filter(p => p.category === category).map(preset => (
              <button
                key={preset.value}
                onClick={() => handleSelect(preset)}
                disabled={disabled}
                className={`preset-button ${selectedValue === preset.value ? 'active' : ''}`}
                title={preset.description}
                type="button"
              >
                <span className="preset-label">{preset.label}</span>
                <span className="preset-value">{preset.value}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        .cron-presets {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .presets-label {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .preset-category {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .category-title {
          margin: 0;
          padding: 0 0 4px 0;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          border-bottom: 1px solid #eee;
        }

        .preset-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 6px;
        }

        .preset-button {
          padding: 8px 10px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .preset-button:hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
        }

        .preset-button.active {
          background-color: #007bff;
          border-color: #0056b3;
          color: white;
        }

        .preset-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preset-label {
          font-size: 13px;
          font-weight: 500;
        }

        .preset-value {
          font-size: 11px;
          font-family: 'Monaco', 'Courier', monospace;
          opacity: 0.7;
        }

        .preset-button.active .preset-value {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};
