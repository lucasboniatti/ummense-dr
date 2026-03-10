import React, { useState } from 'react';
import { CronExpressionInput } from './CronExpressionInput';
import { CronPresets } from './CronPresets';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { RadioGroup, RadioItem } from './ui/RadioGroup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

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

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
];

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
          Tipo de gatilho
        </label>
        <RadioGroup
          value={value.type}
          onValueChange={(nextValue) => handleTriggerTypeChange(nextValue as TriggerConfig['type'])}
          className="grid gap-3 lg:grid-cols-2"
          disabled={disabled}
        >
          <RadioItem
            value="webhook"
            label="Webhook"
            description="Dispara a automação quando um evento externo chega ao endpoint."
            disabled={disabled}
          />
          <RadioItem
            value="scheduled"
            label="Agendado"
            description="Executa a automação em intervalos recorrentes com cron expression."
            disabled={disabled}
          />
        </RadioGroup>
        <p className="mt-3 text-xs text-neutral-500">
          {value.type === 'webhook'
            ? 'Ideal para integrações orientadas a eventos.'
            : 'Ideal para rotinas recorrentes, relatórios e sincronizações.'}
        </p>
      </div>

      {value.type === 'webhook' && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-900">
            URL do webhook
          </label>
          <Input
            type="url"
            placeholder="https://seu-endpoint.com/webhook"
            value={value.webhookUrl || ''}
            onChange={(event) => handleWebhookUrlChange(event.target.value)}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="link"
            onClick={() => setShowWebhookHelp((previous) => !previous)}
            className="justify-start px-0"
          >
            {showWebhookHelp ? 'Ocultar ajuda' : 'Mostrar ajuda'}
          </Button>
          {showWebhookHelp && (
            <div className="app-surface-muted rounded-[16px] p-3 text-xs text-neutral-700">
              <p className="mb-1 font-semibold">Guia rápido</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Envie requests `POST` para disparar a automação.</li>
                <li>Inclua um payload JSON com os dados do evento.</li>
                <li>As respostas são registradas para observabilidade.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {value.type === 'scheduled' && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Timezone
            </label>
            <Select value={value.timezone || 'UTC'} onValueChange={handleTimezoneChange}>
              <SelectTrigger disabled={disabled}>
                <SelectValue placeholder="Selecione um timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Presets rápidos
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
