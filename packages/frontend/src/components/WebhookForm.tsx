import React, { useState, useEffect } from 'react';
import { webhookService } from '../services/webhook.service';

interface WebhookFormProps {
  webhookId?: string;
  onSuccess?: (webhook: any) => void;
  onCancel?: () => void;
}

const validateUrl = (url: string): string | null => {
  if (!url.startsWith('https://')) {
    return 'URL must start with https://';
  }
  try {
    new URL(url);
  } catch {
    return 'Invalid URL format';
  }
  const blocklist = ['localhost', '127.0.0.1', '0.0.0.0'];
  const hostname = new URL(url).hostname;
  if (blocklist.includes(hostname)) {
    return 'Localhost URLs are not allowed for security reasons';
  }
  return null;
};

export const WebhookForm: React.FC<WebhookFormProps> = ({
  webhookId,
  onSuccess,
  onCancel,
}) => {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (webhookId) {
      loadWebhook();
    }
  }, [webhookId]);

  const loadWebhook = async () => {
    try {
      const webhook = await webhookService.getWebhookDetail(webhookId!);
      setUrl(webhook.url);
      setDescription(webhook.description || '');
      setEnabled(webhook.enabled);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value) {
      const err = validateUrl(value);
      setUrlError(err);
    } else {
      setUrlError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      setError('URL is required');
      return;
    }

    const err = validateUrl(url);
    if (err) {
      setUrlError(err);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let webhook;
      if (webhookId) {
        webhook = await webhookService.updateWebhook(webhookId, {
          url,
          description,
          enabled,
        });
      } else {
        webhook = await webhookService.createWebhook({
          url,
          description,
          enabled,
        });
        setGeneratedKey(webhook.apiKey);
      }

      onSuccess?.(webhook);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* API Key Display (on create) */}
      {generatedKey && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm font-semibold text-blue-900">Your API Key (copy and save it somewhere safe):</p>
          <p className="font-mono text-sm mt-2 break-all bg-white p-2 rounded border border-blue-200">
            {generatedKey}
          </p>
          <p className="text-xs text-blue-700 mt-2">This key won't be shown again.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* URL Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Webhook URL *
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com/webhook"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            urlError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
          required
        />
        {urlError && <p className="text-red-600 text-sm mt-1">{urlError}</p>}
        <p className="text-xs text-gray-500 mt-1">Must start with https:// (HTTP only for security)</p>
      </div>

      {/* Description Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this webhook for?"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      {/* Enabled Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
          Enable webhook
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-6">
        <button
          type="submit"
          disabled={loading || !!urlError}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : webhookId ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
