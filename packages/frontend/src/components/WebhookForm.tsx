import React, { useState } from 'react';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';

interface WebhookFormData {
  url: string;
  description?: string;
  enabled: boolean;
}

interface WebhookFormProps {
  onSubmit: (webhook: WebhookFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: WebhookFormData;
}

export function WebhookForm({ onSubmit, onCancel, initialData }: WebhookFormProps) {
  const [formData, setFormData] = useState<WebhookFormData>(
    initialData || { url: '', description: '', enabled: true }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic URL validation
    try {
      new URL(formData.url);
    } catch {
      setError('A URL deve ter um formato válido (ex: https://dominio.com/webhook)');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <FormInput
        label="URL do Webhook *"
        type="url"
        value={formData.url}
        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
        placeholder="https://api.empresa.com/webhooks"
        required
      />

      <FormInput
        label="Descrição"
        type="text"
        value={formData.description || ''}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Para que serve este webhook?"
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
        />
        <label htmlFor="enabled" className="text-sm font-medium text-neutral-900">
          Webhook Ativo
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-neutral-100 justify-end">
        <Button variant="ghost" onClick={onCancel} type="button" disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
