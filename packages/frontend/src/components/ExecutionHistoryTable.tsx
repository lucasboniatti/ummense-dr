import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'skipped':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
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

  const handleSearch = (term: string) => {
    onSearch?.(term);
    // Simulate autocomplete suggestions
    if (term.length > 0) {
      setSearchSuggestions(['timeout', 'database error', 'connection failed', 'validation error'].filter((s) => s.includes(term.toLowerCase())));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
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
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchTerm && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTime !== undefined && (
                <span className="absolute right-3 top-2.5 text-xs text-gray-500">
                  {searchTime}ms
                </span>
              )}

              {/* Autocomplete Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10">
                  {searchSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleSearch(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50 transition"
              title="Filtros avançados"
            >
              ⚙ Filtros
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 border rounded-md">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                className="w-full px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="success">✓ Sucesso</option>
                <option value="failed">✗ Falha</option>
                <option value="skipped">- Ignorado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange({ ...filters, startDate: e.target.value })}
                className="w-full px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange({ ...filters, endDate: e.target.value })}
                className="w-full px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Resultados: {total}
              </label>
              <div className="text-sm text-gray-600 mt-1">{total} execuções</div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                ID Execução
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('timestamp')}
              >
                Data/Hora {sortBy === 'timestamp' && '↓'}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Automação
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('status')}
              >
                Status {sortBy === 'status' && '↓'}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Tipo Gatilho
              </th>
              <th
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('duration')}
              >
                Duração {sortBy === 'duration' && '↓'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {executions.map((execution) => (
              <tr
                key={execution.id}
                className="hover:bg-gray-50 cursor-pointer transition"
                onClick={() => onRowClick(execution.id)}
              >
                <td className="px-6 py-3 text-sm text-gray-900 font-mono">
                  {execution.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-3 text-sm text-gray-900">
                  {format(new Date(execution.started_at), 'dd MMM yyyy HH:mm:ss', {
                    locale: ptBR,
                  })}
                </td>
                <td className="px-6 py-3 text-sm text-gray-900">
                  {execution.automation_name || 'N/A'}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(execution.status)}`}>
                    {getStatusLabel(execution.status)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-900 capitalize">
                  {execution.trigger_type}
                </td>
                <td className="px-6 py-3 text-sm text-gray-900">
                  {execution.duration_ms ? `${execution.duration_ms}ms` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {offset + 1} a {Math.min(offset + limit, total)} de {total} execuções
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            ← Anterior
          </button>
          <div className="text-sm text-gray-600 flex items-center px-4">
            Página {currentPage} de {totalPages}
          </div>
          <button
            onClick={() => onPageChange(Math.min(offset + limit, (totalPages - 1) * limit))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}
