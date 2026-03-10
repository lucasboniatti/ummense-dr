import React, { useState, useEffect } from 'react';
import { Archive, CalendarClock, Info, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Badge, CheckboxField, Input, PageLoader, ProgressSegments } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface RetentionPolicy {
  id: string;
  user_id: string;
  retention_days: number;
  archive_enabled: boolean;
  archive_bucket?: string;
  updated_at: string;
}

export default function AutomationSettingsPage() {
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    retentionDays: 90,
    archiveEnabled: false,
    archiveBucket: '',
  });
  const retentionSegments = Math.max(1, Math.min(4, Math.round((formData.retentionDays - 90) / 525) + 1));
  const retentionMonths = Math.round(formData.retentionDays / 30);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const { data } = await apiClient.get<RetentionPolicy>('/automations/retention-policy');
        setPolicy(data);
        setFormData({
          retentionDays: data.retention_days,
          archiveEnabled: data.archive_enabled,
          archiveBucket: data.archive_bucket || '',
        });
      } catch (err) {
        toast.error('Erro ao carregar', err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    void fetchPolicy();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: updatedPolicy } = await apiClient.put<RetentionPolicy>('/automations/retention-policy', {
        retentionDays: formData.retentionDays,
        archiveEnabled: formData.archiveEnabled,
        archiveBucket: formData.archiveBucket,
      });

      setPolicy(updatedPolicy);
      toast.success('Política atualizada', 'Política de retenção atualizada com sucesso');
    } catch (err) {
      toast.error('Erro ao salvar', err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader message="Carregando configurações de automação..." />;
  }

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-hero-grid gap-4">
          <div className="app-page-heading">
            <p className="app-kicker">Automações</p>
            <h1 className="app-page-title">Configurações de automação</h1>
            <p className="app-page-copy">
              Gerencie retenção do histórico, arquivamento e governança dos dados operacionais em uma única leitura.
            </p>
          </div>

          <div className="app-metric-strip">
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Retenção</p>
                <Badge tone="info">dias</Badge>
              </div>
              <p className="app-metric-value">{formData.retentionDays}</p>
              <p className="app-metric-copy">janela configurada para o histórico</p>
            </div>
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Horizonte</p>
                <Badge tone="info">meses</Badge>
              </div>
              <p className="app-metric-value">{retentionMonths}</p>
              <p className="app-metric-copy">profundidade do histórico operacional</p>
            </div>
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Arquivamento</p>
                <Badge tone={formData.archiveEnabled ? 'success' : 'neutral'}>
                  {formData.archiveEnabled ? 'ativo' : 'desligado'}
                </Badge>
              </div>
              <p className="app-metric-value">{formData.archiveEnabled ? 'On' : 'Off'}</p>
              <p className="app-metric-copy">comportamento antes da limpeza automática</p>
            </div>
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Última atualização</p>
                <Badge tone="neutral">snapshot</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-[color:var(--text-strong)]">
                {policy ? new Date(policy.updated_at).toLocaleString('pt-BR') : 'Aguardando leitura'}
              </p>
              <p className="app-metric-copy">estado vigente da política</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="app-surface p-6">
          <h2 className="mb-6 font-display text-xl font-semibold tracking-[-0.02em] text-[color:var(--text-strong)]">
            Política de retenção de histórico
          </h2>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <label htmlFor="retention" className="block text-sm font-medium text-[color:var(--text-secondary)]">
                  Dias de retenção
                </label>
                <Badge tone="info">{retentionMonths} meses</Badge>
              </div>
              <div className="app-section-card">
                <div className="flex items-center gap-4">
                  <input
                    id="retention"
                    type="range"
                    min="90"
                    max="2190"
                    step="90"
                    value={formData.retentionDays}
                    onChange={(event) =>
                      setFormData({ ...formData, retentionDays: parseInt(event.target.value, 10) })
                    }
                    className="flex-1 accent-primary-600"
                  />
                  <div className="w-20 text-right text-2xl font-semibold text-primary">
                    {formData.retentionDays}
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressSegments filled={retentionSegments} total={4} color="primary" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Limpeza automática
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      Rotina diária às 2 AM UTC
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                      Estratégia atual
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                      {formData.archiveEnabled ? 'Arquivar e depois limpar' : 'Limpar sem arquivar'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                {retentionMonths} meses • Mínimo: 90 dias | Máximo: 2190 dias (6 anos)
              </p>
            </div>

            <div className="border-t border-[color:var(--border-subtle)] pt-6">
              <CheckboxField
                checked={formData.archiveEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, archiveEnabled: Boolean(checked) })
                }
                label="Arquivar dados antigos em S3 antes de deletar"
                hint="Os dados são exportados antes da limpeza automática para permitir análise posterior."
              />
            </div>

            {formData.archiveEnabled && (
              <div>
                <label htmlFor="bucket" className="mb-2 block text-sm font-medium text-[color:var(--text-secondary)]">
                  Bucket S3
                </label>
                <Input
                  id="bucket"
                  type="text"
                  placeholder="my-bucket/archive"
                  value={formData.archiveBucket}
                  onChange={(event) =>
                    setFormData({ ...formData, archiveBucket: event.target.value })
                  }
                />
              </div>
            )}

            <div className="app-surface-muted rounded-[20px] border-t border-transparent p-4">
              <p className="text-sm text-[color:var(--text-strong)]">
                <strong>Resumo:</strong> Os registros de execução com mais de{' '}
                <strong>{formData.retentionDays} dias</strong> serão deletados automaticamente
                {formData.archiveEnabled && ' após serem arquivados em S3'}. Este processo ocorre
                diariamente às 2 AM UTC.
              </p>
            </div>

            <div className="flex gap-3 border-t border-[color:var(--border-subtle)] pt-6">
              <Button onClick={handleSave} disabled={saving} variant="primary">
                {saving ? 'Salvando...' : 'Salvar configurações'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="app-note-card flex gap-3">
            <Info className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" aria-hidden="true" />
            <div>
              <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                Sobre a política
              </h3>
              <p className="text-sm text-[color:var(--text-secondary)]">
                Apenas o histórico de execução entra nesta regra. Os logs de auditoria continuam imutáveis para compliance e rastreabilidade.
              </p>
            </div>
          </div>
          <div className="app-note-card flex gap-3">
            <Archive className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
            <div>
              <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                Arquivamento
              </h3>
              <p className="text-sm text-[color:var(--text-secondary)]">
                {formData.archiveEnabled
                  ? `O bucket alvo atual é ${formData.archiveBucket || 'não informado'}. Revise este destino antes de manter a política ativa.`
                  : 'O arquivamento está desligado. Os dados serão apenas removidos quando ultrapassarem a janela configurada.'}
              </p>
            </div>
          </div>
          <div className="app-note-card flex gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
            <div>
              <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                Rotina automática
              </h3>
              <p className="text-sm text-[color:var(--text-secondary)]">
                A limpeza roda diariamente às 2 AM UTC. Se você precisar guardar dados por mais tempo, ajuste a retenção antes da próxima janela.
              </p>
            </div>
          </div>
          {policy && (
            <div className="app-note-card flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
              <div>
                <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                  Snapshot vigente
                </h3>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Última atualização: {new Date(policy.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
