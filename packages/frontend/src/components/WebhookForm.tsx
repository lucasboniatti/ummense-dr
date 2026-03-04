import React, { useState } from 'react';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';

interface WebhookFormProps {
  onSubmit?: (webhook: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

export function WebhookForm({ onSubmit, onCancel, initialData }: WebhookFormProps) {
  const [formData, setFormData] = useState(initialData || { url: '', secret: '', events: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      onSubmit?.(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <FormInput
        label="Webhook URL"
        type="url"
        value={formData.url}
        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
        placeholder="https://api.example.com/webhooks"
        required
      />

      <FormInput
        label="Secret (optional)"
        type="password"
        value={formData.secret}
        onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
        hint="Used for signing webhook requests"
      />

      <FormInput
        label="Events (comma-separated)"
        type="text"
        value={formData.events}
        onChange={(e) => setFormData(prev => ({ ...prev, events: e.target.value }))}
        placeholder="execution.completed, execution.failed"
      />

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Webhook'}
        </Button>
      </div>
    </form>
  );
}
