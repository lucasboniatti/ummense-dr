import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { webhookService } from '../../../services/webhook.service';
import { analyticsService } from '../../../services/analytics.service';
import { DeliveryStatusBadge } from '../../../components/DeliveryStatusBadge';
import { WebhookForm } from '../../../components/WebhookForm';
import { PageLoader, EmptyState } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Webhook } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; url: string }>({
    open: false,
    id: '',
    url: '',
  });
  const [deleting, setDeleting] = useState(false);
  const { success, error: toastError } = useToast();

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
    setDeleteConfirm({ open: true, id, url: webhooks.find(w => w.id === id)?.url || '' });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await webhookService.deleteWebhook(deleteConfirm.id);
      analyticsService.trackWebhookDeleted(deleteConfirm.id);
      setWebhooks(webhooks.filter(w => w.id !== deleteConfirm.id));
      success('Webhook excluído', `O webhook ${deleteConfirm.url} foi removido com sucesso.`);
      setDeleteConfirm({ open: false, id: '', url: '' });
    } catch (err) {
      toastError('Erro ao excluir', 'Não foi possível excluir o webhook.');
    } finally {
      setDeleting(false);
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
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="app-page-heading">
            <p className="app-kicker">Contatos & webhooks</p>
            <h1 className="app-page-title">Webhooks</h1>
            <p className="app-page-copy">
              Gerencie endpoints, acompanhe taxa de sucesso e chegue ao historico de entregas sem sair da trilha operacional.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus size={18} className="mr-2" />
            Novo webhook
          </button>
        </div>
      </section>

      {error && (
        <div className="app-inline-banner app-inline-banner-error">
          <strong>Webhooks</strong>
          {error}
        </div>
      )}

      <div className="app-table-shell">
        {loading ? (
          <PageLoader message="Carregando webhooks..." />
        ) : webhooks.length === 0 ? (
          <EmptyState
            icon={<Webhook size={48} />}
            title="Nenhum webhook encontrado"
            description="Você ainda não possui nenhum webhook configurado."
            actionLabel="Criar webhook"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <table className="w-full">
            <thead className="border-b border-[color:var(--border-subtle)] bg-neutral-50/90">
              <tr>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">URL</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Status</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Taxa de sucesso</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Ultimo disparo</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="border-b border-[color:var(--border-subtle)] transition hover:bg-neutral-50/80">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/webhooks/${webhook.id}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      {webhook.url}
                    </Link>
                    {webhook.description && (
                      <p className="mt-1 text-xs text-neutral-500">{webhook.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${webhook.enabled
                      ? 'bg-success-100 text-success-700'
                      : 'bg-neutral-100 text-neutral-700'
                      }`}>
                      {webhook.enabled ? 'Ativo' : 'Inativo'}
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
                    {webhook.lastTriggeredAt ? formatDate(webhook.lastTriggeredAt) : 'Nunca'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/webhooks/${webhook.id}`}
                        className="app-control inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-neutral-600 hover:text-neutral-900"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        className="app-control inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-error-600 hover:text-error-900"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="app-surface w-full max-w-md rounded-[26px] p-6">
            <h2 className="mb-4 text-xl font-bold tracking-[-0.02em] text-neutral-900">Novo webhook</h2>
            <WebhookForm
              onSubmit={async (data) => {
                await webhookService.createWebhook(data);
                success('Webhook criado', 'O webhook foi criado com sucesso.');
                setShowCreateModal(false);
                loadWebhooks();
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}
        title="Excluir webhook"
        description={`Tem certeza que deseja excluir o webhook "${deleteConfirm.url}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
