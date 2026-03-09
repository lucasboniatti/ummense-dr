import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './composite/Table';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { FileSearch } from 'lucide-react';
import SavePresetDialog from './SavePresetDialog';
import type { SavedFilterDefinition, SavedFilterPreset } from '@/services/history.service';

interface ExecutionRecord {
  id: string;
  automation_id: string;
  automation_name: string;
  status: string;
  trigger_type: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_context?: any;
  created_at: string;
}

interface ExecutionHistoryTableProps {
  executions: ExecutionRecord[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onRowClick: (executionId: string) => void;
  sortBy?: 'timestamp' | 'status' | 'duration';
  onSort?: (sortBy: string) => void;
  onSearch?: (searchTerm: string) => void;
  onSearchSuggestions?: (searchTerm: string) => Promise<string[]>;
  searchTerm?: string;
  searchTime?: number;
  currentFilters?: SavedFilterDefinition;
  onFilterChange?: (filters: Partial<SavedFilterDefinition>) => void;
  savedFilters?: SavedFilterPreset[];
  selectedPresetId?: string;
  savedFiltersLoading?: boolean;
  savedFiltersError?: string | null;
  presetActionPending?: boolean;
  onApplyPreset?: (presetId: string) => void;
  onSavePreset?: (
    name: string,
    description: string,
    filters: SavedFilterDefinition
  ) => Promise<void>;
  onDeletePreset?: (presetId: string) => Promise<void>;
}

export function ExecutionHistoryTable({
  executions,
  total,
  limit,
  offset,
  onPageChange,
  onRowClick,
  sortBy = 'timestamp',
  onSort,
  onSearch,
  onSearchSuggestions,
  searchTerm = '',
  searchTime,
  currentFilters,
  onFilterChange,
  savedFilters = [],
  selectedPresetId = '',
  savedFiltersLoading = false,
  savedFiltersError,
  presetActionPending = false,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
}: ExecutionHistoryTableProps) {
  const currentPage = total === 0 ? 1 : Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / limit));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [isDeletingPreset, setIsDeletingPreset] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const selectedPreset = useMemo(
    () => savedFilters.find((preset) => preset.id === selectedPresetId) || null,
    [savedFilters, selectedPresetId]
  );

  const presetSnapshot = useMemo(
    () => sanitizeVisibleFilters({ ...currentFilters, searchTerm }),
    [currentFilters, searchTerm]
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'skipped':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return '✓ Sucesso';
      case 'failed':
        return '✗ Falha';
      case 'skipped':
        return '- Ignorado';
      default:
        return status;
    }
  };

  const handleSearch = async (term: string) => {
    onSearch?.(term);

    if (!term) {
      setShowSuggestions(false);
      setSearchSuggestions([]);
      return;
    }

    try {
      if (onSearchSuggestions) {
        const remoteSuggestions = await onSearchSuggestions(term);
        const filtered = remoteSuggestions.filter((suggestion) =>
          suggestion.toLowerCase().includes(term.toLowerCase())
        );

        if (filtered.length > 0) {
          setSearchSuggestions(filtered.slice(0, 8));
          setShowSuggestions(true);
          return;
        }
      }
    } catch {
      // Fall back to static suggestions below.
    }

    const localFallback = [
      'timeout',
      'database error',
      'connection failed',
      'validation error',
    ].filter((suggestion) => suggestion.includes(term.toLowerCase()));

    setSearchSuggestions(localFallback);
    setShowSuggestions(localFallback.length > 0);
  };

  const handleDeletePreset = async () => {
    if (!selectedPresetId || !onDeletePreset || !selectedPreset || selectedPreset.is_default) {
      return;
    }

    const confirmed = window.confirm(`Remover o preset "${selectedPreset.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsDeletingPreset(true);

    try {
      await onDeletePreset(selectedPresetId);
    } finally {
      setIsDeletingPreset(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Buscar por erro, automacao ou mensagem..."
                value={searchTerm}
                onChange={(e) => {
                  void handleSearch(e.target.value);
                }}
                onFocus={() => searchTerm && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchTime !== undefined && (
                <span className="absolute right-3 top-2.5 text-xs text-neutral-500">
                  {searchTime}ms
                </span>
              )}

              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10">
                  {searchSuggestions.map((suggestion, idx) => (
                    <div
                      key={`${suggestion}-${idx}`}
                      onClick={() => {
                        void handleSearch(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-neutral-50 cursor-pointer text-sm text-neutral-700"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              <select
                value={selectedPresetId}
                onChange={(e) => onApplyPreset?.(e.target.value)}
                disabled={savedFiltersLoading || presetActionPending}
                className="min-w-56 px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">
                  {savedFiltersLoading ? 'Carregando presets...' : 'Carregar preset...'}
                </option>
                {savedFilters.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.is_default ? `Padrao: ${preset.name}` : preset.name}
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSavePresetDialog(true)}
                disabled={presetActionPending}
              >
                Salvar preset
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDeletePreset}
                disabled={
                  !selectedPresetId ||
                  !selectedPreset ||
                  selectedPreset.is_default ||
                  presetActionPending ||
                  isDeletingPreset
                }
                title={
                  selectedPreset?.is_default
                    ? 'Presets padrao nao podem ser removidos'
                    : 'Excluir preset selecionado'
                }
              >
                {isDeletingPreset ? 'Excluindo...' : 'Excluir preset'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                title="Filtros avancados"
              >
                ⚙ Filtros
              </Button>
            </div>
          </div>
        </div>

        {(selectedPreset?.description || savedFiltersError) && (
          <div className="flex flex-col gap-1 text-xs">
            {selectedPreset?.description && (
              <span className="text-neutral-600">
                Preset ativo: <span className="font-semibold">{selectedPreset.name}</span> -{' '}
                {selectedPreset.description}
              </span>
            )}
            {savedFiltersError && <span className="text-error-700">{savedFiltersError}</span>}
          </div>
        )}

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 p-4 bg-neutral-100 border border-neutral-200 rounded-lg md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Status</label>
              <select
                value={currentFilters?.status || ''}
                onChange={(e) => onFilterChange?.({ status: normalizeStatus(e.target.value) })}
                className="w-full px-2 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Todos</option>
                <option value="success">✓ Sucesso</option>
                <option value="failed">✗ Falha</option>
                <option value="skipped">- Ignorado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Periodo</label>
              <select
                value={currentFilters?.dateRange || '7d'}
                onChange={(e) =>
                  onFilterChange?.({
                    dateRange: normalizeDateRange(e.target.value),
                  })
                }
                className="w-full px-2 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="24h">Ultimas 24h</option>
                <option value="7d">Ultimos 7 dias</option>
                <option value="30d">Ultimos 30 dias</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Resultados
              </label>
              <div className="text-sm text-neutral-700 font-semibold">{total} execucoes</div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Execucao</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-neutral-100"
                onClick={() => onSort?.('timestamp')}
              >
                Data/Hora {sortBy === 'timestamp' && '↓'}
              </TableHead>
              <TableHead>Automacao</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-neutral-100"
                onClick={() => onSort?.('status')}
              >
                Status {sortBy === 'status' && '↓'}
              </TableHead>
              <TableHead>Tipo Gatilho</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-neutral-100"
                onClick={() => onSort?.('duration')}
              >
                Duracao {sortBy === 'duration' && '↓'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.length === 0 && (
              <TableRow>
                <TableCell className="py-12" colSpan={6}>
                  <EmptyState
                    icon={<FileSearch size={48} />}
                    title="Nenhuma execução encontrada"
                    description="O histórico está vazio ou os filtros atuais não encontraram resultados."
                    variant="compact"
                  />
                </TableCell>
              </TableRow>
            )}
            {executions.map((execution) => (
              <TableRow
                key={execution.id}
                className="cursor-pointer"
                onClick={() => onRowClick(execution.id)}
              >
                <TableCell className="font-mono text-xs">{execution.id.substring(0, 8)}...</TableCell>
                <TableCell className="text-sm">
                  {format(new Date(execution.started_at), 'dd MMM yyyy HH:mm:ss', {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell className="text-sm">{execution.automation_name || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(execution.status)}>
                    {getStatusLabel(execution.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm capitalize">{execution.trigger_type}</TableCell>
                <TableCell className="text-sm">
                  {execution.duration_ms ? `${execution.duration_ms}ms` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-neutral-600">
          {total === 0
            ? 'Nenhuma execucao para exibir'
            : `Mostrando ${offset + 1} a ${Math.min(offset + limit, total)} de ${total} execucoes`}
        </div>
        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
          >
            ← Anterior
          </Button>
          <div className="text-sm text-neutral-600 min-w-32 text-center">
            Pagina {currentPage} de {totalPages}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.min(offset + limit, (totalPages - 1) * limit))}
            disabled={total === 0 || currentPage >= totalPages}
          >
            Proxima →
          </Button>
        </div>
      </div>

      <SavePresetDialog
        isOpen={showSavePresetDialog}
        currentFilters={presetSnapshot}
        onCancel={() => setShowSavePresetDialog(false)}
        onSave={async (name, description, filters) => {
          if (!onSavePreset) {
            return;
          }

          await onSavePreset(name, description, filters as SavedFilterDefinition);
        }}
      />
    </div>
  );
}

function normalizeStatus(value: string): SavedFilterDefinition['status'] | undefined {
  if (value === 'success' || value === 'failed' || value === 'skipped') {
    return value;
  }

  return undefined;
}

function normalizeDateRange(value: string): SavedFilterDefinition['dateRange'] {
  if (value === '24h' || value === '30d') {
    return value;
  }

  return '7d';
}

function sanitizeVisibleFilters(filters: SavedFilterDefinition): SavedFilterDefinition {
  const sanitized: SavedFilterDefinition = {};

  if (filters.automationId) {
    sanitized.automationId = filters.automationId;
  }

  if (filters.status) {
    sanitized.status = filters.status;
  }

  if (filters.dateRange) {
    sanitized.dateRange = filters.dateRange;
  }

  if (filters.searchTerm) {
    sanitized.searchTerm = filters.searchTerm;
  }

  if (filters.sortBy) {
    sanitized.sortBy = filters.sortBy;
  }

  if (filters.sortOrder) {
    sanitized.sortOrder = filters.sortOrder;
  }

  return sanitized;
}
