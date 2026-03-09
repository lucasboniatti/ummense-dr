import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { webhookService } from '../../../services/webhook.service';
import { DeliveryHistory } from '../../../components/DeliveryHistory';
import { TestWebhookModal } from '../../../components/TestWebhookModal';

interface Webhook {
  id: string;
  url: string;
  description?: string;
  enabled: boolean;
  apiKeyPreview: string;
  createdAt: string;
  recentDeliveries: any[];
}

export default function WebhookDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadWebhookDetail();
    }
  }, [id]);

  const loadWebhookDetail = async () => {
    try {
      setLoading(true);
      const data = await webhookService.getWebhookDetail(id as string);
      setWebhook(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-neutral-500">Carregando webhook...</div>;
  }

  if (error || !webhook) {
    return (
      <div className="p-6">
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          {error || 'Webhook não encontrado'}
        </div>
        <Link
          href="/dashboard/webhooks"
          className="mt-4 inline-flex items-center gap-2 font-medium text-primary-600 hover:underline"
        >
          <ArrowLeft size={18} />
          Voltar para Webhooks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/webhooks" className="text-primary-600 hover:text-primary-700">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{webhook.url}</h1>
          <p className="text-neutral-600 mt-1">{webhook.description || 'Sem descrição'}</p>
        </div>
      </div>

      {/* Webhook Details Card */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold text-neutral-700">URL</label>
            <p className="mt-1 text-neutral-900">{webhook.url}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-700">API Key (Últimos 4 caracteres)</label>
            <p className="mt-1 text-neutral-900 font-mono">{webhook.apiKeyPreview}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-700">Status</label>
            <p className="mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${webhook.enabled
                  ? 'bg-success-100 text-success-700'
                  : 'bg-neutral-100 text-neutral-700'
                }`}>
                {webhook.enabled ? 'Ativo' : 'Inativo'}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-700">Criado em</label>
            <p className="mt-1 text-neutral-900">
              {new Date(webhook.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTestModal(true)}
          className="mt-6 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 font-semibold"
        >
          <RefreshCw size={18} />
          Testar Webhook
        </button>
      </div>

      {/* Delivery History */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Histórico de Entregas</h2>
        <DeliveryHistory webhookId={webhook.id} />
      </div>

      {/* Test Modal */}
      {showTestModal && (
        <TestWebhookModal
          webhookId={webhook.id}
          onClose={() => setShowTestModal(false)}
          onSuccess={() => {
            setShowTestModal(false);
            loadWebhookDetail();
          }}
        />
      )}
    </div>
  );
}
