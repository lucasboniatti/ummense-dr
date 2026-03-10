import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { CheckboxField, Input, PageLoader } from '../../components/ui';
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
        <div className="app-page-heading">
          <p className="app-kicker">Automacoes</p>
          <h1 className="app-page-title">Configuracoes de automacao</h1>
          <p className="app-page-copy">
            Gerencie a politica de retencao do historico e o comportamento do arquivamento.
          </p>
        </div>
      </section>

      <div className="app-surface p-6">
        <h2 className="mb-6 text-xl font-semibold tracking-[-0.02em] text-neutral-900">
          Política de retenção de histórico
        </h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="retention" className="mb-2 block text-sm font-medium text-neutral-700">
              Dias de retenção
            </label>
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
              <div className="w-20 text-right text-2xl font-semibold text-primary-600">
                {formData.retentionDays}
              </div>
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {Math.round(formData.retentionDays / 30)} meses • Mínimo: 90 dias | Máximo: 2190 dias (6 anos)
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
              <label htmlFor="bucket" className="mb-2 block text-sm font-medium text-neutral-700">
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
            <p className="text-sm text-primary-900">
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

      <div className="app-inline-banner app-inline-banner-success">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary-900">
          <Info className="h-4 w-4" aria-hidden="true" />
          Sobre política de retenção
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-primary-800">
          <li>Os logs de auditoria não são deletados (imutáveis para compliance).</li>
          <li>Apenas o histórico de execução é afetado pela política de retenção.</li>
          <li>A limpeza automática ocorre diariamente às 2 AM UTC.</li>
          <li>Você pode exportar dados antes que sejam deletados.</li>
        </ul>
        {policy && (
          <p className="mt-2 text-xs text-primary-800">
            Última atualização: {new Date(policy.updated_at).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  );
}
