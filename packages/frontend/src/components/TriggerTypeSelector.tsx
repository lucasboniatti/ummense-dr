import React, { useState } from 'react';
import { CronExpressionInput } from './CronExpressionInput';
import { CronPresets } from './CronPresets';

export interface TriggerConfig {
  type: 'webhook' | 'scheduled';
  webhookUrl?: string;
  cronExpression?: string;
  timezone?: string;
}

interface TriggerTypeSelectorProps {
  value: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
  disabled?: boolean;
}

export const TriggerTypeSelector: React.FC<TriggerTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [showWebhookHelp, setShowWebhookHelp] = useState(false);

  const handleTriggerTypeChange = (newType: 'webhook' | 'scheduled') => {
    onChange({
      ...value,
      type: newType,
    });
  };

  const handleCronChange = (cronExpression: string) => {
    onChange({
      ...value,
      cronExpression,
    });
  };

  const handleTimezoneChange = (timezone: string) => {
    onChange({
      ...value,
      timezone,
    });
  };

  const handleWebhookUrlChange = (url: string) => {
    onChange({
      ...value,
      webhookUrl: url,
    });
  };

  return (
    <div className="app-surface space-y-6 p-6">
      <div>
        <label className="mb-3 block text-sm font-semibold text-neutral-900">
          Trigger Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="trigger-type"
              value="webhook"
              checked={value.type === 'webhook'}
              onChange={() => handleTriggerTypeChange('webhook')}
              disabled={disabled}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-neutral-700">Webhook (Event-Driven)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="trigger-type"
              value="scheduled"
              checked={value.type === 'scheduled'}
              onChange={() => handleTriggerTypeChange('scheduled')}
              disabled={disabled}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-neutral-700">Scheduled (Recurring)</span>
          </label>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {value.type === 'webhook'
            ? 'Automation triggers when a webhook is received'
            : 'Automation triggers on a recurring schedule using cron expressions'}
        </p>
      </div>

      {value.type === 'webhook' && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-900">
            Webhook URL
          </label>
          <div className="space-y-2">
            <input
              type="url"
              placeholder="https://your-webhook-endpoint.com/webhook"
              value={value.webhookUrl || ''}
              onChange={(e) => handleWebhookUrlChange(e.target.value)}
              disabled={disabled}
              className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-500"
            />
            <button
              type="button"
              onClick={() => setShowWebhookHelp(!showWebhookHelp)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {showWebhookHelp ? 'Hide help' : 'Show webhook help'}
            </button>
            {showWebhookHelp && (
              <div className="app-surface-muted rounded-[16px] p-3 text-xs text-neutral-700">
                <p className="font-semibold mb-1">Webhook Guide:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Send POST requests to your URL to trigger automations</li>
                  <li>Include JSON payload in request body with automation trigger data</li>
                  <li>Responses are logged for debugging</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {value.type === 'scheduled' && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Timezone
            </label>
            <select
              value={value.timezone || 'UTC'}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={disabled}
              className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm disabled:bg-neutral-50"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Chicago">America/Chicago (CST/CDT)</option>
              <option value="America/Denver">America/Denver (MST/MDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Quick Presets (Optional)
            </label>
            <CronPresets onSelect={handleCronChange} />
          </div>
          <CronExpressionInput
            value={value.cronExpression || ''}
            onChange={handleCronChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};
