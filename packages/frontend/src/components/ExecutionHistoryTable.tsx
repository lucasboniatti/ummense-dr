import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './composite/Table';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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
  onFilterChange?: (filters: any) => void;
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
  onFilterChange,
}: ExecutionHistoryTableProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    automationId: '',
    startDate: '',
    endDate: '',
  });

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

    if (term.length > 0) {
      try {
        if (onSearchSuggestions) {
          const remoteSuggestions = await onSearchSuggestions(term);
          const filtered = remoteSuggestions.filter((s) =>
            s.toLowerCase().includes(term.toLowerCase())
          );

          if (filtered.length > 0) {
            setSearchSuggestions(filtered.slice(0, 8));
            setShowSuggestions(true);
            return;
          }
        }
      } catch (error) {
        // Fallback below keeps UX working even if API request fails.
      }

      const localFallback = [
        'timeout',
        'database error',
        'connection failed',
        'validation error',
      ].filter((s) => s.includes(term.toLowerCase()));

      setSearchSuggestions(localFallback);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Section */}
      <div className="space-y-3">
        {/* Full-Text Search Box with Autocomplete */}
        <div className="relative">
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Buscar por erro, automação, mensagem... (busca em tempo real)"
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

              {/* Autocomplete Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10">
                  {searchSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
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

            {/* Advanced Filters Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title="Filtros avançados"
            >
              ⚙ Filtros
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-4 gap-3 p-4 bg-neutral-100 border border-neutral-200 rounded-lg">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                className="w-full px-2 py-1 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Todos</option>
                <option value="success">✓ Sucesso</option>
                <option value="failed">✗ Falha</option>
                <option value="skipped">- Ignorado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange({ ...filters, startDate: e.target.value })}
                className="w-full px-2 py-1 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange({ ...filters, endDate: e.target.value })}
                className="w-full px-2 py-1 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Resultados
              </label>
              <div className="text-sm text-neutral-700 font-semibold">{total} execuções</div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Execução</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-neutral-100"
                onClick={() => onSort?.('timestamp')}
              >
                Data/Hora {sortBy === 'timestamp' && '↓'}
              </TableHead>
              <TableHead>Automação</TableHead>
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
                Duração {sortBy === 'duration' && '↓'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableCell className="text-sm">{execution.duration_ms ? `${execution.duration_ms}ms` : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600">
          Mostrando {offset + 1} a {Math.min(offset + limit, total)} de {total} execuções
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
            Página {currentPage} de {totalPages}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.min(offset + limit, (totalPages - 1) * limit))}
            disabled={currentPage >= totalPages}
          >
            Próxima →
          </Button>
        </div>
      </div>
    </div>
  );
}
