import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { webhookService } from '../../../services/webhook.service';
import { DeliveryHistory } from '../../../components/DeliveryHistory';
import { TestWebhookModal } from '../../../components/TestWebhookModal';
import { PageLoader } from '../../../components/ui/PageLoader';

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
    return <div className="app-page"><PageLoader message="Carregando webhook..." /></div>;
  }

  if (error || !webhook) {
    return (
      <div className="app-page">
        <div className="app-inline-banner app-inline-banner-error">
          <strong>Webhook</strong>
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
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="app-page-heading">
            <Link href="/dashboard/webhooks" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline">
              <ArrowLeft size={16} />
              Voltar para webhooks
            </Link>
            <p className="app-kicker">Webhook</p>
            <h1 className="app-page-title break-all">{webhook.url}</h1>
            <p className="app-page-copy">{webhook.description || 'Sem descrição operacional cadastrada.'}</p>
          </div>

          <button
            onClick={() => setShowTestModal(true)}
            className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Testar webhook
          </button>
        </div>
      </section>

      <div className="app-surface p-6">
        <div className="grid gap-6 md:grid-cols-2">
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
              {new Date(webhook.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-[-0.03em] text-neutral-900">Historico de entregas</h2>
        <DeliveryHistory webhookId={webhook.id} />
      </div>
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
