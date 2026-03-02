import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { webhookService } from '../services/webhook.service';
import { useWebhookFilters } from '../hooks/useWebhookFilters';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

interface Delivery {
  id: string;
  webhook_id: string;
  event_id: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending' | 'dead_lettered';
  attempt_count: number;
  response_status_code: number | null;
  response_body: string;
  created_at: string;
  next_retry_at: string | null;
}

interface DeliveryHistoryProps {
  webhookId: string;
  onDeliveryClick?: (delivery: Delivery) => void;
}

export const DeliveryHistory: React.FC<DeliveryHistoryProps> = ({
  webhookId,
  onDeliveryClick,
}) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const {
    filters,
    updateStatus,
    updateSearch,
    setQuickDateRange,
    clearFilters,
    hasActiveFilters,
  } = useWebhookFilters();

  useEffect(() => {
    loadDeliveries();
  }, [filters, webhookId]);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const result = await webhookService.getDeliveryHistory(webhookId, {
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search,
        limit: 50,
        offset: 0,
      });
      setDeliveries(result.deliveries);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-2.5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por ID do evento ou tipo..."
            value={filters.search || ''}
            onChange={(e) => updateSearch(e.target.value || undefined)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status and Date Filters */}
        <div className="flex gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => updateStatus(e.target.value || undefined)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Status</option>
            <option value="success">Entregue</option>
            <option value="failed">Falhou</option>
            <option value="pending">Aguardando</option>
            <option value="dead_lettered">Descartado</option>
          </select>

          {/* Quick Date Range */}
          <div className="flex gap-1">
            <button
              onClick={() => setQuickDateRange('last24h')}
              className={`px-3 py-1 text-sm rounded ${
                filters.startDate
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              Últimas 24h
            </button>
            <button
              onClick={() => setQuickDateRange('last7d')}
              className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            >
              Últimos 7d
            </button>
            <button
              onClick={() => setQuickDateRange('last30d')}
              className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            >
              Últimos 30d
            </button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        {loading ? (
          'Carregando...'
        ) : (
          <>
            {deliveries.length > 0 ? (
              `Mostrando ${deliveries.length} de ${total} entregas`
            ) : (
              <span className="text-gray-400">Nenhuma entrega encontrada</span>
            )}
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Tipo de Evento
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Tentativa
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Código HTTP
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Data/Hora
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma entrega encontrada
                </td>
              </tr>
            ) : (
              deliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onDeliveryClick?.(delivery)}
                >
                  <td className="px-4 py-3">
                    <DeliveryStatusBadge status={delivery.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {delivery.event_type}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {delivery.attempt_count}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {delivery.response_status_code || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(delivery.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={16} className="text-gray-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
