import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ExecutionHistoryTable } from '@/components/ExecutionHistoryTable';
import { PageLoader } from '@/components/ui';
import {
  historyService,
  SavedFilterDefinition,
  SavedFilterPreset,
} from '@/services/history.service';

type HistoryFilters = {
  automationId: string;
  status: '' | 'success' | 'failed' | 'skipped';
  dateRange: '24h' | '7d' | '30d';
  searchTerm: string;
  sortBy: 'timestamp' | 'status' | 'duration';
  sortOrder: 'asc' | 'desc';
  offset: number;
  limit: number;
};

const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  automationId: '',
  status: '',
  dateRange: '7d',
  searchTerm: '',
  sortBy: 'timestamp',
  sortOrder: 'desc',
  offset: 0,
  limit: 50,
};

export default function ExecutionHistoryPage() {
  const router = useRouter();

  const [executions, setExecutions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilterPreset[]>([]);
  const [savedFiltersLoading, setSavedFiltersLoading] = useState(true);
  const [savedFiltersError, setSavedFiltersError] = useState<string | null>(null);
  const [presetActionPending, setPresetActionPending] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);

  const fetchExecutions = useCallback(async (activeFilters: HistoryFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await historyService.queryExecutionHistory(
        buildExecutionQuery(activeFilters)
      );

      setExecutions(response.executions);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar historico');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSavedFilters = useCallback(async (preferredSelectedId?: string) => {
    setSavedFiltersLoading(true);

    try {
      const presets = await historyService.listSavedFilters();
      setSavedFilters(presets);
      setSavedFiltersError(null);
      setSelectedPresetId((currentSelectedId) => {
        const candidate = preferredSelectedId ?? currentSelectedId;
        if (!candidate) {
          return '';
        }

        return presets.some((preset) => preset.id === candidate) ? candidate : '';
      });
    } catch (err) {
      setSavedFiltersError(
        err instanceof Error ? err.message : 'Erro ao carregar presets salvos'
      );
    } finally {
      setSavedFiltersLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExecutions(filters);
  }, [filters, fetchExecutions]);

  useEffect(() => {
    void loadSavedFilters();
  }, [loadSavedFilters]);

  const updateFilters = useCallback(
    (
      update:
        | Partial<HistoryFilters>
        | ((current: HistoryFilters) => HistoryFilters),
      options?: { resetPage?: boolean; preservePreset?: boolean }
    ) => {
      const resetPage = options?.resetPage !== false;
      const preservePreset = options?.preservePreset === true;

      setFilters((current) => {
        const next =
          typeof update === 'function'
            ? update(current)
            : {
              ...current,
              ...update,
            };

        return {
          ...next,
          offset: resetPage ? 0 : next.offset,
        };
      });

      if (!preservePreset) {
        setSelectedPresetId('');
      }
    },
    []
  );

  const handleApplyPreset = useCallback(
    (presetId: string) => {
      if (!presetId) {
        setSelectedPresetId('');
        return;
      }

      const preset = savedFilters.find((entry) => entry.id === presetId);
      if (!preset) {
        return;
      }

      setSelectedPresetId(presetId);
      setSavedFiltersError(null);
      setFilters((current) => ({
        ...DEFAULT_HISTORY_FILTERS,
        limit: current.limit,
        ...applyPresetDefinition(preset.filter_json),
        offset: 0,
      }));
    },
    [savedFilters]
  );

  const handleSavePreset = useCallback(
    async (name: string, description: string, currentFilters: SavedFilterDefinition) => {
      setPresetActionPending(true);

      try {
        const createdPreset = await historyService.createSavedFilter({
          name,
          description,
          filter_json: currentFilters,
        });

        await loadSavedFilters(createdPreset.id);
        setSelectedPresetId(createdPreset.id);
        setSavedFiltersError(null);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Erro ao salvar preset');
      } finally {
        setPresetActionPending(false);
      }
    },
    [loadSavedFilters]
  );

  const handleDeletePreset = useCallback(
    async (presetId: string) => {
      setPresetActionPending(true);

      try {
        await historyService.deleteSavedFilter(presetId);
        setSelectedPresetId('');
        await loadSavedFilters('');
        setSavedFiltersError(null);
      } catch (err) {
        setSavedFiltersError(
          err instanceof Error ? err.message : 'Erro ao excluir preset'
        );
        throw err instanceof Error ? err : new Error('Erro ao excluir preset');
      } finally {
        setPresetActionPending(false);
      }
    },
    [loadSavedFilters]
  );

  const handleExportCSV = async () => {
    await historyService.exportAsCSV(buildExecutionQuery(filters));
  };

  const handleExportJSON = async () => {
    await historyService.exportAsJSON(buildExecutionQuery(filters));
  };

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-hero-grid">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="app-page-heading">
              <p className="app-kicker">Historico</p>
              <h1 className="app-page-title">Historico de execucoes</h1>
              <p className="app-page-copy">
              Consulte, filtre e reutilize buscas do historico das automacoes.
            </p>
            </div>

            <div className="app-toolbar-cluster">
            <button
              onClick={() => void handleExportCSV()}
              className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Exportar CSV
            </button>
            <button
              onClick={() => void handleExportJSON()}
              className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-success-600 px-4 text-sm font-semibold text-white hover:bg-success-700"
            >
              Exportar JSON
            </button>
            </div>
          </div>

          {error && (
            <div className="app-inline-banner app-inline-banner-error">
              <strong>Historico</strong>
              {error}
            </div>
          )}
        </div>
      </section>

        {loading ? (
          <PageLoader message="Carregando historico..." />
        ) : (
          <ExecutionHistoryTable
            executions={executions}
            total={total}
            limit={filters.limit}
            offset={filters.offset}
            sortBy={filters.sortBy}
            currentFilters={buildSavedFilterDefinition(filters)}
            savedFilters={savedFilters}
            selectedPresetId={selectedPresetId}
            savedFiltersLoading={savedFiltersLoading}
            savedFiltersError={savedFiltersError}
            presetActionPending={presetActionPending}
            onSort={(sortBy) =>
              updateFilters({
                sortBy: sortBy as HistoryFilters['sortBy'],
                sortOrder: 'desc',
              })
            }
            onPageChange={(offset) =>
              updateFilters(
                (current) => ({
                  ...current,
                  offset,
                }),
                { resetPage: false, preservePreset: true }
              )
            }
            onSearch={(searchTerm) =>
              updateFilters({
                searchTerm,
              })
            }
            onSearchSuggestions={async (searchTerm) => {
              const suggestions = await historyService.getSearchSuggestions(15);
              return suggestions.filter((suggestion) =>
                suggestion.toLowerCase().includes(searchTerm.toLowerCase())
              );
            }}
            onFilterChange={(partialFilters) =>
              updateFilters({
                ...partialFilters,
                status: partialFilters.status ?? '',
                dateRange: partialFilters.dateRange ?? filters.dateRange,
              } as Partial<HistoryFilters>)
            }
            onApplyPreset={handleApplyPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            searchTerm={filters.searchTerm}
            onRowClick={(executionId) => router.push(`/automations/history/${executionId}`)}
          />
        )}
    </div>
  );
}

function buildExecutionQuery(filters: HistoryFilters) {
  const { startDate, endDate } = resolveDateRange(filters.dateRange);

  return {
    automationId: filters.automationId || undefined,
    status: filters.status || undefined,
    searchTerm: filters.searchTerm || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    limit: filters.limit,
    offset: filters.offset,
    startDate,
    endDate,
  };
}

function resolveDateRange(dateRange: HistoryFilters['dateRange']) {
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (dateRange === '24h') {
    startDate.setDate(startDate.getDate() - 1);
  } else if (dateRange === '30d') {
    startDate.setDate(startDate.getDate() - 30);
  } else {
    startDate.setDate(startDate.getDate() - 7);
  }

  return { startDate, endDate };
}

function buildSavedFilterDefinition(filters: HistoryFilters): SavedFilterDefinition {
  const definition: SavedFilterDefinition = {
    dateRange: filters.dateRange,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  if (filters.automationId) {
    definition.automationId = filters.automationId;
  }

  if (filters.status) {
    definition.status = filters.status;
  }

  if (filters.searchTerm) {
    definition.searchTerm = filters.searchTerm;
  }

  return definition;
}

function applyPresetDefinition(preset: SavedFilterDefinition): Partial<HistoryFilters> {
  return {
    automationId: preset.automationId || '',
    status: preset.status || '',
    dateRange: preset.dateRange || DEFAULT_HISTORY_FILTERS.dateRange,
    searchTerm: preset.searchTerm || '',
    sortBy: preset.sortBy || DEFAULT_HISTORY_FILTERS.sortBy,
    sortOrder: preset.sortOrder || DEFAULT_HISTORY_FILTERS.sortOrder,
  };
}
