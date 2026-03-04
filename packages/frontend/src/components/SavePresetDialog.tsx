'use client';

import React, { useState, useCallback } from 'react';

interface SavePresetDialogProps {
  currentFilters: Record<string, any>;
  onSave: (name: string, description: string, filters: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

/**
 * Save Preset Dialog Component - Story 3.6.3
 *
 * Modal dialog for saving current filter state as a reusable preset.
 * Validates:
 * - Preset name (required, max 100 chars)
 * - Description (optional, max 500 chars)
 * - Max 20 presets per user (enforced in API)
 *
 * Usage:
 * <SavePresetDialog
 *   currentFilters={filters}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 *   isOpen={showDialog}
 * />
 */
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
      setError('Preset name is required');
      return;
    }

    if (name.length > 100) {
      setError('Preset name must be 100 characters or less');
      return;
    }

    if (description.length > 500) {
      setError('Description must be 500 characters or less');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(name.trim(), description.trim(), currentFilters);
      // Reset form on success
      setName('');
      setDescription('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save preset. Please try again.'
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-testid="save-preset-dialog-overlay"
    >
      <div
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg max-w-md w-full mx-4"
        data-testid="save-preset-dialog"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Save Filter Preset
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Save current filters to quickly reuse them later
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Preset Name */}
          <div>
            <label
              htmlFor="preset-name"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Preset Name <span className="text-error-600">*</span>
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g., 'Failed Last 24h'"
              maxLength={100}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isSaving}
              data-testid="preset-name-input"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {name.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="preset-description"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Description <span className="text-neutral-400">(Optional)</span>
            </label>
            <textarea
              id="preset-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError(null);
              }}
              placeholder="e.g., 'All failed automations in the last 24 hours'"
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={isSaving}
              data-testid="preset-description-input"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Filter Summary */}
          <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 border border-neutral-200 dark:border-neutral-600">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
              Filters to Save:
            </p>
            <ul className="text-xs text-neutral-700 dark:text-neutral-400 space-y-1">
              {Object.entries(currentFilters).length > 0 ? (
                Object.entries(currentFilters).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-mono">{key}</span>:{' '}
                    {typeof value === 'object'
                      ? JSON.stringify(value).substring(0, 50)
                      : String(value).substring(0, 50)}
                  </li>
                ))
              ) : (
                <li className="text-neutral-500 dark:text-neutral-500">No filters selected</li>
              )}
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg text-sm text-error-800 dark:text-error-200"
              data-testid="save-preset-error"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-preset-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-preset-save-btn"
          >
            {isSaving ? 'Saving...' : 'Save Preset'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavePresetDialog;
