import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { webhookService } from '../../../services/webhook.service';
import { analyticsService } from '../../../services/analytics.service';
import { DeliveryStatusBadge } from '../../../components/DeliveryStatusBadge';

interface Webhook {
  id: string;
  url: string;
  description?: string;
  enabled: boolean;
  apiKeyPreview: string;
  createdAt: string;
  lastTriggeredAt?: string;
  successRate: number;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadWebhooks();
  }, []);

  useEffect(() => {
    // Track page view
    analyticsService.trackWebhookListViewed(webhooks.length);
  }, [webhooks.length]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const data = await webhookService.listWebhooks();
      setWebhooks(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook? This action cannot be undone.')) return;
    try {
      await webhookService.deleteWebhook(id);
      analyticsService.trackWebhookDeleted(id);
      setWebhooks(webhooks.filter(w => w.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-neutral-600 mt-1">Manage your webhook endpoints and delivery history</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus size={20} />
          New Webhook
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Webhooks Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-8">
            <p>Loading webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600">No webhooks yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">URL</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Success Rate</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Last Triggered</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/webhooks/${webhook.id}`}>
                      <a className="text-primary-600 hover:underline font-medium">{webhook.url}</a>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      webhook.enabled
                        ? 'bg-success-100 text-success-700'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {webhook.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-success-500 rounded-full transition-all"
                          style={{ width: `${webhook.successRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-neutral-700 min-w-12">{webhook.successRate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {webhook.lastTriggeredAt ? formatDate(webhook.lastTriggeredAt) : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/webhooks/${webhook.id}`}>
                        <a className="text-neutral-600 hover:text-neutral-900">
                          <Edit2 size={18} />
                        </a>
                      </Link>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        className="text-error-600 hover:text-error-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Webhook</h2>
            <p className="text-neutral-600 text-center py-8">Webhook creation form will be implemented in WebhookForm component</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-4 w-full bg-neutral-200 text-neutral-800 px-4 py-2 rounded-lg hover:bg-neutral-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
