import React, { useState, useEffect } from 'react';
import { Activity, Edit2, Plus, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { webhookService } from '../../../services/webhook.service';
import { analyticsService } from '../../../services/analytics.service';
import { WebhookForm } from '../../../components/WebhookForm';
import { Badge, Button, EmptyState, PageLoader } from '../../../components/ui';
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
  const activeWebhooks = webhooks.filter((webhook) => webhook.enabled).length;
  const pausedWebhooks = Math.max(0, webhooks.length - activeWebhooks);
  const averageSuccessRate = webhooks.length
    ? webhooks.reduce((acc, webhook) => acc + webhook.successRate, 0) / webhooks.length
    : 0;
  const recentlyTriggered = webhooks.filter((webhook) => {
    if (!webhook.lastTriggeredAt) {
      return false;
    }

    return Date.now() - new Date(webhook.lastTriggeredAt).getTime() <= 1000 * 60 * 60 * 24;
  }).length;

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
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-hero-grid gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="app-page-heading">
              <p className="app-kicker">Contatos & webhooks</p>
              <h1 className="app-page-title">Webhooks</h1>
              <p className="app-page-copy">
                Gerencie endpoints, acompanhe a saúde das entregas e mantenha a trilha de automações pronta para operar.
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              <Plus size={18} className="mr-2" />
              Novo webhook
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Base conectada
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                {webhooks.length}
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                endpoints monitorados no workspace
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Em operação
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {activeWebhooks}
                </p>
                <Badge tone="success">Ativos</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                {pausedWebhooks} pausados ou desligados
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Taxa média
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                {averageSuccessRate.toFixed(0)}%
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--border-default)]">
                <div
                  className="h-full rounded-full bg-[color:var(--color-success-500)]"
                  style={{ width: `${Math.min(100, averageSuccessRate)}%` }}
                />
              </div>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Últimas 24h
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {recentlyTriggered}
                </p>
                <Badge tone={recentlyTriggered > 0 ? 'info' : 'neutral'}>
                  atividade
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                webhooks com disparo recente
              </p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="app-inline-banner app-inline-banner-error">
          <strong>Webhooks</strong>
          {error}
        </div>
      )}

      <div className="app-table-shell">
        <div className="flex flex-col gap-3 border-b border-[color:var(--border-default)] bg-[color:var(--surface-muted)]/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">Operação dos endpoints</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
              Catálogo de entrega
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{activeWebhooks} ativos</Badge>
            <Badge tone="neutral">{pausedWebhooks} pausados</Badge>
            <Badge tone={averageSuccessRate >= 90 ? 'success' : averageSuccessRate >= 70 ? 'warning' : 'error'}>
              média {averageSuccessRate.toFixed(0)}%
            </Badge>
          </div>
        </div>
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
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">URL</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Status</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Taxa de sucesso</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Último disparo</th>
                <th className="h-12 px-6 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="border-b border-[color:var(--border-subtle)] transition hover:bg-[color:var(--surface-emphasis)]/60">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/webhooks/${webhook.id}`}
                      className="app-link font-medium"
                    >
                      {webhook.url}
                    </Link>
                    {webhook.description && (
                      <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{webhook.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={webhook.enabled ? 'success' : 'neutral'}>
                      {webhook.enabled ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-2 rounded-full bg-success-500 transition-all"
                          style={{ width: `${webhook.successRate}%` }}
                        />
                      </div>
                      <span className="min-w-12 text-sm font-semibold text-[color:var(--text-secondary)]">
                        {webhook.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[color:var(--text-secondary)]">
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

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="app-note-card flex gap-3">
          <Activity className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
          <div>
            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
              Operação recomendada
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Mantenha os endpoints ativos com descrições claras e acompanhe as taxas de sucesso para identificar quedas antes de afetarem suas automações.
            </p>
          </div>
        </div>
        <div className="app-note-card flex gap-3">
          <Zap className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
          <div>
            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Leitura rápida</h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Use a lista para revisar os endpoints mais sensíveis, editar detalhes e remover webhooks inativos sem sair da trilha principal.
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="app-surface w-full max-w-md rounded-[26px] p-6">
            <h2 className="mb-4 font-display text-xl font-bold tracking-[-0.02em] text-[color:var(--text-strong)]">Novo webhook</h2>
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
