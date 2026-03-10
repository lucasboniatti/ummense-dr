import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, PencilLine, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { webhookService } from '../../../services/webhook.service';
import { DeliveryHistory } from '../../../components/DeliveryHistory';
import { TestWebhookModal } from '../../../components/TestWebhookModal';
import { PageLoader } from '../../../components/ui/PageLoader';
import { WebhookForm } from '../../../components/WebhookForm';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../contexts/ToastContext';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const { success, error: toastError } = useToast();

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
          className="app-link mt-4 inline-flex items-center gap-2 font-medium"
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
            <Link href="/dashboard/webhooks" className="app-link inline-flex items-center gap-2 text-sm font-semibold">
              <ArrowLeft size={16} />
              Voltar para webhooks
            </Link>
            <p className="app-kicker">Webhook</p>
            <h1 className="app-page-title break-all">{webhook.url}</h1>
            <p className="app-page-copy">{webhook.description || 'Sem descrição operacional cadastrada.'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              <PencilLine size={16} className="mr-2" />
              Editar webhook
            </Button>
            <Button onClick={() => setShowTestModal(true)} variant="primary">
              <RefreshCw size={16} className="mr-2" />
              Testar webhook
            </Button>
          </div>
        </div>
      </section>

      <div className="app-surface p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">URL</label>
            <p className="mt-1 text-[color:var(--text-strong)]">{webhook.url}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">API Key (Últimos 4 caracteres)</label>
            <p className="mt-1 font-mono text-[color:var(--text-strong)]">{webhook.apiKeyPreview}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">Status</label>
            <p className="mt-1">
              <span className={`app-status-pill ${webhook.enabled
                  ? 'app-status-pill-success'
                  : 'app-status-pill-neutral'
                }`}>
                {webhook.enabled ? 'Ativo' : 'Inativo'}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-[color:var(--text-secondary)]">Criado em</label>
            <p className="mt-1 text-[color:var(--text-strong)]">
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
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">Histórico de entregas</h2>
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

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm">
          <div className="app-surface w-full max-w-md rounded-[26px] p-6">
            <h2 className="mb-4 font-display text-xl font-bold tracking-[-0.02em] text-[color:var(--text-strong)]">
              Editar webhook
            </h2>
            <WebhookForm
              initialData={{
                url: webhook.url,
                description: webhook.description || '',
                enabled: webhook.enabled,
              }}
              onSubmit={async (data) => {
                try {
                  await webhookService.updateWebhook(webhook.id, data);
                  success('Webhook atualizado', 'As alterações foram salvas com sucesso.');
                  setShowEditModal(false);
                  await loadWebhookDetail();
                } catch (submitError) {
                  toastError(
                    'Erro ao atualizar',
                    submitError instanceof Error
                      ? submitError.message
                      : 'Não foi possível atualizar o webhook.'
                  );
                  throw submitError;
                }
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
