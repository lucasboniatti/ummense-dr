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
      setError('O nome do preset é obrigatório.');
      return;
    }

    if (name.length > 100) {
      setError('O nome do preset deve ter no máximo 100 caracteres.');
      return;
    }

    if (description.length > 500) {
      setError('A descrição deve ter no máximo 500 caracteres.');
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
        err instanceof Error ? err.message : 'Não foi possível salvar o preset. Tente novamente.'
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
          <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">
            Salvar preset
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Salve o estado atual dos filtros para reutilizar depois
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label
              htmlFor="preset-name"
              className="mb-1 block text-sm font-medium text-[color:var(--text-secondary)]"
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
              placeholder="Ex.: Falhas nas últimas 24h"
              maxLength={100}
              className="app-control h-11 w-full rounded-[var(--radius-control)] px-3 text-[color:var(--text-strong)] placeholder:text-[color:var(--text-muted)]"
              disabled={isSaving}
              data-testid="preset-name-input"
            />
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              {name.length}/100 caracteres
            </p>
          </div>

          <div>
            <label
              htmlFor="preset-description"
              className="mb-1 block text-sm font-medium text-[color:var(--text-secondary)]"
            >
              Descrição <span className="text-[color:var(--text-muted)]">(opcional)</span>
            </label>
            <textarea
              id="preset-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
              placeholder="Ex.: Todas as automações com falha nas últimas 24 horas"
              maxLength={500}
              rows={3}
              className="app-control min-h-[110px] w-full rounded-[var(--radius-control)] px-3 py-3 text-[color:var(--text-strong)] placeholder:text-[color:var(--text-muted)]"
              disabled={isSaving}
              data-testid="preset-description-input"
            />
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              {description.length}/500 caracteres
            </p>
          </div>

          <div className="app-surface-muted rounded-[18px] p-3">
            <p className="mb-2 text-xs font-semibold text-[color:var(--text-secondary)]">
              Filtros que serão salvos:
            </p>
            <ul className="space-y-1 text-xs text-[color:var(--text-secondary)]">
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
                <li className="text-[color:var(--text-muted)]">
                  Nenhum filtro ativo. O preset salvará a visualização padrão.
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
            className="app-control h-10 rounded-[var(--radius-control)] px-4 font-medium text-[color:var(--text-secondary)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
