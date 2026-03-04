import React, { useState, useEffect } from 'react';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    retentionDays: 90,
    archiveEnabled: false,
    archiveBucket: '',
  });

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await fetch('/api/automations/retention-policy');
        if (!response.ok) {
          throw new Error('Failed to fetch retention policy');
        }

        const data = await response.json();
        setPolicy(data);
        setFormData({
          retentionDays: data.retention_days,
          archiveEnabled: data.archive_enabled,
          archiveBucket: data.archive_bucket || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/automations/retention-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retentionDays: formData.retentionDays,
          archiveEnabled: formData.archiveEnabled,
          archiveBucket: formData.archiveBucket,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update retention policy');
      }

      const updatedPolicy = await response.json();
      setPolicy(updatedPolicy);
      setSuccess('Política de retenção atualizada com sucesso');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-neutral-600 mt-4">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Configurações de Automação</h1>
          <p className="text-neutral-600 mt-2">Gerencie as políticas de retenção do histórico</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6">
            <p className="text-error-800">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
            <p className="text-success-800">{success}</p>
          </div>
        )}

        {/* Retention Policy Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">
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
                  className="flex-1"
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
            <div className="border-t pt-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.archiveEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, archiveEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-neutral-300"
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                />
              </div>
            )}

            {/* Summary */}
            <div className="border-t pt-6 bg-primary-50 rounded-lg p-4">
              <p className="text-sm text-primary-900">
                <strong>Resumo:</strong> Os registros de execução com mais de{' '}
                <strong>{formData.retentionDays} dias</strong> serão deletados automaticamente
                {formData.archiveEnabled && ' após serem arquivados em S3'}. Este processo ocorre
                diariamente às 2 AM UTC.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <h3 className="font-semibold text-primary-900 mb-2">ℹ️ Sobre Política de Retenção</h3>
          <ul className="text-sm text-primary-800 space-y-1 list-disc list-inside">
            <li>Os logs de auditoria NÃO são deletados (imutáveis para compliance)</li>
            <li>Apenas o histórico de execução é afetado pela política de retenção</li>
            <li>A limpeza automática ocorre diariamente às 2 AM UTC</li>
            <li>Você pode exportar dados antes que sejam deletados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
