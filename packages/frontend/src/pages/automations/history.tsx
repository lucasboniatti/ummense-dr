import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AlertTriangle, Clock3, Layers3, Sparkles } from 'lucide-react';
import { Badge, PageLoader } from '@/components/ui';
import { ExecutionHistoryTable } from '@/components/ExecutionHistoryTable';
import { Button } from '@/components/ui';
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
  const successCount = executions.filter((execution) => execution.status === 'success').length;
  const failedCount = executions.filter((execution) => execution.status === 'failed').length;
  const skippedCount = executions.filter((execution) => execution.status === 'skipped').length;
  const averageDurationMs = executions.length
    ? Math.round(
      executions.reduce((acc, execution) => acc + (execution.duration_ms || 0), 0) /
      executions.length
    )
    : 0;
  const activeFiltersCount = [
    filters.automationId,
    filters.status,
    filters.searchTerm,
    filters.dateRange !== '7d' ? filters.dateRange : '',
  ].filter(Boolean).length;

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
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
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
              <p className="app-kicker">Histórico</p>
              <h1 className="app-page-title">Histórico de execuções</h1>
              <p className="app-page-copy">
                Consulte, filtre e reutilize buscas do histórico das automações.
              </p>
            </div>

            <div className="app-toolbar-cluster">
              <Button onClick={() => void handleExportCSV()} variant="primary">
                Exportar CSV
              </Button>
              <Button onClick={() => void handleExportJSON()} variant="success">
                Exportar JSON
              </Button>
            </div>
          </div>

          {error && (
            <div className="app-inline-banner app-inline-banner-error">
              <strong>Histórico</strong>
              {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Janela analisada
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                {total}
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                execuções encontradas na vista atual
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Resultado
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {successCount}
                </p>
                <Badge tone="success">sucesso</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                {failedCount} falhas e {skippedCount} ignoradas
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Duração média
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {averageDurationMs}
                </p>
                <Badge tone="info">ms</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                média desta página de resultados
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Contexto ativo
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {activeFiltersCount}
                </p>
                <Badge tone={selectedPresetId ? 'info' : 'neutral'}>
                  {selectedPresetId ? 'preset ativo' : 'vista base'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                filtros aplicados para navegar melhor nas execuções
              </p>
            </div>
          </div>
        </div>
      </section>

        {loading ? (
          <PageLoader message="Carregando histórico..." />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
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

              <div className="space-y-3">
                <div className="app-note-card flex gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                  <div>
                    <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                      Leitura rápida
                    </h3>
                    <p className="text-sm text-[color:var(--text-secondary)]">
                      Salve presets para repetir investigações importantes e manter a mesma leitura entre operação, suporte e produto.
                    </p>
                  </div>
                </div>
                <div className="app-note-card flex gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                  <div>
                    <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                      Ritmo da fila
                    </h3>
                    <p className="text-sm text-[color:var(--text-secondary)]">
                      Observe duração, falhas e gatilhos para detectar gargalos cedo, antes de afetarem entregas e integrações externas.
                    </p>
                  </div>
                </div>
                <div className="app-note-card flex gap-3">
                  {failedCount > 0 ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-warning-500" />
                  ) : (
                    <Layers3 className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                  )}
                  <div>
                    <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
                      Sinal desta janela
                    </h3>
                    <p className="text-sm text-[color:var(--text-secondary)]">
                      {failedCount > 0
                        ? `${failedCount} execuções falharam na vista atual. Vale abrir os detalhes e consolidar um preset de acompanhamento.`
                        : 'Sem falhas visíveis nesta janela. Use esta vista como baseline para comparações futuras.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
