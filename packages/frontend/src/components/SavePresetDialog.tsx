'use client';

import React, { useState, useCallback } from 'react';

interface SavePresetDialogProps {
  currentFilters: Record<string, any>;
  onSave: (name: string, description: string, filters: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

const SavePresetDialog: React.FC<SavePresetDialogProps> = ({
  currentFilters,
  onSave,
  onCancel,
  isOpen,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    // Validation
    if (!name.trim()) {
      setError('O nome do preset e obrigatorio.');
      return;
    }

    if (name.length > 100) {
      setError('O nome do preset deve ter no maximo 100 caracteres.');
      return;
    }

    if (description.length > 500) {
      setError('A descricao deve ter no maximo 500 caracteres.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(name.trim(), description.trim(), currentFilters);
      setName('');
      setDescription('');
      onCancel();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nao foi possivel salvar o preset. Tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [name, description, currentFilters, onSave]);

  const handleCancel = useCallback(() => {
    setName('');
    setDescription('');
    setError(null);
    onCancel();
  }, [onCancel]);

  const visibleFilters = Object.entries(currentFilters).filter(([, value]) => {
    if (value === '' || value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return true;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm"
      data-testid="save-preset-dialog-overlay"
    >
      <div
        className="app-surface mx-4 w-full max-w-md overflow-hidden rounded-[26px]"
        data-testid="save-preset-dialog"
      >
        <div className="border-b border-[color:var(--border-subtle)] px-6 py-4">
          <p className="app-kicker">Historico</p>
          <h2 className="text-lg font-semibold text-neutral-900">
            Salvar preset
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Salve o estado atual dos filtros para reutilizar depois
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="preset-name"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Nome do preset <span className="text-error-600">*</span>
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ex.: Falhas nas ultimas 24h"
              maxLength={100}
              className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-neutral-900 placeholder:text-neutral-400"
              disabled={isSaving}
              data-testid="preset-name-input"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {name.length}/100 caracteres
            </p>
          </div>

          <div>
            <label
              htmlFor="preset-description"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Descricao <span className="text-neutral-400">(opcional)</span>
            </label>
            <textarea
              id="preset-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
              placeholder="Ex.: Todas as automacoes com falha nas ultimas 24 horas"
              maxLength={500}
              rows={3}
              className="app-control min-h-[110px] w-full rounded-[var(--radius-control)] px-3 py-3 text-neutral-900 placeholder:text-neutral-400"
              disabled={isSaving}
              data-testid="preset-description-input"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {description.length}/500 caracteres
            </p>
          </div>

          <div className="app-surface-muted rounded-[18px] p-3">
            <p className="mb-2 text-xs font-semibold text-neutral-600">
              Filtros que serao salvos:
            </p>
            <ul className="space-y-1 text-xs text-neutral-700">
              {visibleFilters.length > 0 ? (
                visibleFilters.map(([key, value]) => (
                  <li key={key}>
                    <span className="font-mono">{key}</span>:{' '}
                    {typeof value === 'object'
                      ? JSON.stringify(value).substring(0, 50)
                      : String(value).substring(0, 50)}
                  </li>
                ))
              ) : (
                <li className="text-neutral-500">
                  Nenhum filtro ativo. O preset salvara a visualizacao padrao.
                </li>
              )}
            </ul>
          </div>

          {error && (
            <div
              className="app-inline-banner app-inline-banner-error"
              data-testid="save-preset-error"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--border-subtle)] px-6 py-4">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="app-control h-10 rounded-[var(--radius-control)] px-4 font-medium text-neutral-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="save-preset-cancel-btn"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="app-control h-10 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="save-preset-save-btn"
          >
            {isSaving ? 'Salvando...' : 'Salvar preset'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavePresetDialog;
