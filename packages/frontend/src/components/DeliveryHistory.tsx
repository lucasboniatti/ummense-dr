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
      <div className="app-toolbar space-y-3 p-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-2.5 text-neutral-400"
          />
          <input
            type="text"
            placeholder="Buscar por ID do evento ou tipo..."
            value={filters.search || ''}
            onChange={(e) => updateSearch(e.target.value || undefined)}
            className="app-control h-11 w-full rounded-[var(--radius-control)] pl-10 pr-4"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.status || ''}
            onChange={(e) => updateStatus(e.target.value || undefined)}
            className="app-control h-10 rounded-[var(--radius-control)] px-3 text-sm"
          >
            <option value="">Todos os Status</option>
            <option value="success">Entregue</option>
            <option value="failed">Falhou</option>
            <option value="pending">Aguardando</option>
            <option value="dead_lettered">Descartado</option>
          </select>

          <div className="flex gap-1">
            <button
              onClick={() => setQuickDateRange('last24h')}
              className={`app-chip-toggle ${
                filters.startDate
                  ? 'app-chip-toggle-active'
                  : ''
              }`}
            >
              Últimas 24h
            </button>
            <button
              onClick={() => setQuickDateRange('last7d')}
              className="app-chip-toggle"
            >
              Últimos 7d
            </button>
            <button
              onClick={() => setQuickDateRange('last30d')}
              className="app-chip-toggle"
            >
              Últimos 30d
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="app-chip-toggle"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-neutral-600">
        {loading ? (
          'Carregando...'
        ) : (
          <>
            {deliveries.length > 0 ? (
              `Mostrando ${deliveries.length} de ${total} entregas`
            ) : (
              <span className="text-neutral-400">Nenhuma entrega encontrada</span>
            )}
          </>
        )}
      </div>

      <div className="app-table-shell overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50/90 border-b border-[color:var(--border-subtle)]">
            <tr>
              <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Status
              </th>
              <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Tipo de Evento
              </th>
              <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Tentativa
              </th>
              <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Código HTTP
              </th>
              <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                Data/Hora
              </th>
              <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500"></th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Nenhuma entrega encontrada
                </td>
              </tr>
            ) : (
              deliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="cursor-pointer border-b border-[color:var(--border-subtle)] hover:bg-neutral-50"
                  onClick={() => onDeliveryClick?.(delivery)}
                >
                  <td className="px-4 py-3">
                    <DeliveryStatusBadge status={delivery.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                    {delivery.event_type}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {delivery.attempt_count}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                    {delivery.response_status_code || '-'}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatDate(delivery.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={16} className="text-neutral-400" />
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
