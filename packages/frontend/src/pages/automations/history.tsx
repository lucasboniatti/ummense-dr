import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExecutionHistoryTable } from '@/components/ExecutionHistoryTable';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { historyService } from '@/services/history.service';

export default function ExecutionHistoryPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();

  const [executions, setExecutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    automationId: '',
    status: '',
    dateRange: '7d',
    searchTerm: '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
    offset: 0,
    limit: 50,
  });

  // Fetch executions
  const fetchExecutions = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      switch (filters.dateRange) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      const params = new URLSearchParams({
        limit: String(filters.limit),
        offset: String(filters.offset),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      });

      if (filters.automationId) params.append('automationId', filters.automationId);
      if (filters.status) params.append('status', filters.status);
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);

      const response = await fetch(`/api/automations/history?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch execution history');
      }

      const data = await response.json();
      setExecutions(data.executions);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [filters]);

  const handleExportCSV = async () => {
    const response = await fetch('/api/automations/history/export/csv');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'execution-history.csv';
    a.click();
  };

  const handleExportJSON = async () => {
    const response = await fetch('/api/automations/history/export/json');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'execution-history.json';
    a.click();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Histórico de Execuções</h1>
          <p className="text-neutral-600 mt-2">Veja o histórico de todas as suas automações</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Período
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: e.target.value, offset: 0 })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              >
                <option value="24h">Últimas 24h</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value, offset: 0 })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              >
                <option value="">Todos</option>
                <option value="success">Sucesso</option>
                <option value="failed">Falha</option>
                <option value="skipped">Ignorado</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="ID de execução ou nome da automação..."
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters({ ...filters, searchTerm: e.target.value, offset: 0 })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
            >
              Exportar CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-success-600 text-white text-sm rounded-md hover:bg-success-700"
            >
              Exportar JSON
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6">
            <p className="text-error-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-neutral-600 mt-4">Carregando histórico...</p>
          </div>
        )}

        {/* Table */}
        {!loading && executions.length > 0 && (
          <ExecutionHistoryTable
            executions={executions}
            total={total}
            limit={filters.limit}
            offset={filters.offset}
            sortBy={filters.sortBy as any}
            onSort={(sortBy) =>
              setFilters((prev) => ({ ...prev, sortBy, offset: 0 }))
            }
            onPageChange={(offset) => setFilters((prev) => ({ ...prev, offset }))}
            onSearch={(searchTerm) =>
              setFilters((prev) => ({ ...prev, searchTerm, offset: 0 }))
            }
            onSearchSuggestions={async (searchTerm) => {
              const suggestions = await historyService.getSearchSuggestions(15);
              return suggestions.filter((s) =>
                s.toLowerCase().includes(searchTerm.toLowerCase())
              );
            }}
            searchTerm={filters.searchTerm}
            onRowClick={(executionId) =>
              router.push(`/automations/history/${executionId}`)
            }
          />
        )}

        {/* Empty State */}
        {!loading && executions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-neutral-500">Nenhuma execução encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
