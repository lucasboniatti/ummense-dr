import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api.client';
import { PageLoader } from '../../components/ui';
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
        toast.error('Erro ao carregar', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

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
      toast.error('Erro ao salvar', err instanceof Error ? err.message : 'Unknown error');
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
          <p className="app-page-copy">Gerencie a politica de retencao do historico e o comportamento do arquivamento.</p>
        </div>
      </section>

      <div className="app-surface p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6 tracking-[-0.02em]">
            Política de Retenção de Histórico
          </h2>

          <div className="space-y-6">
            {/* Retention Days */}
            <div>
              <label htmlFor="retention" className="block text-sm font-medium text-neutral-700 mb-2">
                Dias de Retenção
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="retention"
                  type="range"
                  min="90"
                  max="2190"
                  step="90"
                  value={formData.retentionDays}
                  onChange={(e) =>
                    setFormData({ ...formData, retentionDays: parseInt(e.target.value) })
                  }
                  className="flex-1 accent-primary-600"
                />
                <div className="text-2xl font-semibold text-primary-600 w-20 text-right">
                  {formData.retentionDays}
                </div>
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                {Math.round(formData.retentionDays / 30)} meses • Mínimo: 90 dias | Máximo: 2190 dias (6 anos)
              </p>
            </div>

            {/* Archive Option */}
            <div className="border-t border-[color:var(--border-subtle)] pt-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.archiveEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, archiveEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-neutral-300 accent-primary-600"
                />
                <span className="font-medium text-neutral-700">
                  Arquivar dados antigos em S3 antes de deletar
                </span>
              </label>
              <p className="text-sm text-neutral-500 mt-2 ml-7">
                Os dados serão exportados para S3 antes de serem deletados, permitindo análise posterior
              </p>
            </div>

            {/* Archive Bucket */}
            {formData.archiveEnabled && (
              <div>
                <label
                  htmlFor="bucket"
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  Bucket S3
                </label>
                <input
                  id="bucket"
                  type="text"
                  placeholder="my-bucket/archive"
                  value={formData.archiveBucket}
                  onChange={(e) =>
                    setFormData({ ...formData, archiveBucket: e.target.value })
                  }
                  className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-sm"
                />
              </div>
            )}

            <div className="app-surface-muted border-t border-transparent rounded-[20px] p-4">
              <p className="text-sm text-primary-900">
                <strong>Resumo:</strong> Os registros de execução com mais de{' '}
                <strong>{formData.retentionDays} dias</strong> serão deletados automaticamente
                {formData.archiveEnabled && ' após serem arquivados em S3'}. Este processo ocorre
                diariamente às 2 AM UTC.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-6 border-t border-[color:var(--border-subtle)]">
              <button
                onClick={handleSave}
                disabled={saving}
                className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-6 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
      </div>

      <div className="app-inline-banner app-inline-banner-success">
          <h3 className="font-semibold text-primary-900 mb-2">ℹ️ Sobre Política de Retenção</h3>
          <ul className="text-sm text-primary-800 space-y-1 list-disc list-inside">
            <li>Os logs de auditoria NÃO são deletados (imutáveis para compliance)</li>
            <li>Apenas o histórico de execução é afetado pela política de retenção</li>
            <li>A limpeza automática ocorre diariamente às 2 AM UTC</li>
            <li>Você pode exportar dados antes que sejam deletados</li>
          </ul>
      </div>
    </div>
  );
}
