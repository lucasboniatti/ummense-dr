/**
 * DLQTable Component - Display Dead Letter Queue items
 * Story 3.2: Webhook Reliability & Retry Logic
 */

import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './composite/Table';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { PageLoader, EmptyState } from './ui';
import { MailX } from 'lucide-react';
import { DLQService, DLQItem, DLQQueryResult } from '../services/dlq.service';

interface DLQTableProps {
  automationId: string;
  onRetry?: (dlqItemId: string) => void;
  onClear?: (dlqItemId: string) => void;
  onSelectItem?: (dlqItem: DLQItem) => void;
}

export const DLQTable: React.FC<DLQTableProps> = ({
  automationId,
  onRetry,
  onClear,
  onSelectItem
}) => {
  const [items, setItems] = useState<DLQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastErrorAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterError, setFilterError] = useState('');
  const [filterUrl, setFilterUrl] = useState('');

  const dlqService = new DLQService();
  const PAGE_SIZE = 20;

  // Fetch DLQ items
  useEffect(() => {
    fetchItems();
  }, [page, sortBy, sortOrder, filterError, filterUrl]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await dlqService.queryDLQ(
        automationId,
        {
          webhookUrl: filterUrl || undefined,
          errorContains: filterError || undefined
        },
        {
          page,
          limit: PAGE_SIZE,
          sortBy,
          sortOrder
        }
      );

      setItems(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar itens da DLQ';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (dlqItemId: string) => {
    try {
      setLoading(true);
      await dlqService.retryDLQItem(automationId, dlqItemId);
      onRetry?.(dlqItemId);
      await fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao tentar novamente';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (dlqItemId: string) => {
    try {
      setLoading(true);
      await dlqService.clearDLQItem(automationId, dlqItemId);
      onClear?.(dlqItemId);
      await fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao limpar';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchRetry = async () => {
    if (selectedItems.size === 0) return;

    try {
      setLoading(true);
      const result = await dlqService.batchRetryDLQ(automationId, Array.from(selectedItems));
      if (result.summary.failed > 0) {
        setError(`Retry failed for ${result.summary.failed} items`);
      }
      setSelectedItems(new Set());
      await fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha no retry em lote';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchClear = async () => {
    if (selectedItems.size === 0) return;

    try {
      setLoading(true);
      const result = await dlqService.batchClearDLQ(automationId, Array.from(selectedItems));
      if (result.summary.failed > 0) {
        setError(`Clear failed for ${result.summary.failed} items`);
      }
      setSelectedItems(new Set());
      await fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha na limpeza em lote';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (dlqItemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(dlqItemId)) {
      newSelected.delete(dlqItemId);
    } else {
      newSelected.add(dlqItemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const truncateError = (error: string, maxLength: number = 100) => {
    return error.length > maxLength ? error.substring(0, maxLength) + '...' : error;
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-error-100 border border-error-400 text-error-700 rounded-md text-sm flex justify-between items-center" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-error-700 hover:text-error-900 font-semibold">
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-lg">
        <div>
          <label htmlFor="filter-url" className="block text-sm font-semibold text-neutral-700 mb-1">Webhook URL</label>
          <input
            id="filter-url"
            type="text"
            placeholder="Filtrar por URL..."
            value={filterUrl}
            onChange={(e) => {
              setFilterUrl(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="filter-error" className="block text-sm font-semibold text-neutral-700 mb-1">Mensagem de Erro</label>
          <input
            id="filter-error"
            type="text"
            placeholder="Filtrar por erro..."
            value={filterError}
            onChange={(e) => {
              setFilterError(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="sort-by" className="block text-sm font-semibold text-neutral-700 mb-1">Ordenar Por</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'createdAt' | 'lastErrorAt');
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="createdAt">Data de Criação</option>
            <option value="lastErrorAt">Último Erro</option>
          </select>
        </div>

        <div>
          <label htmlFor="sort-order" className="block text-sm font-semibold text-neutral-700 mb-1">Ordem</label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'asc' | 'desc');
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="desc">Mais Recentes</option>
            <option value="asc">Mais Antigos</option>
          </select>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <span className="font-semibold text-primary-900 flex-1">{selectedItems.size} itens selecionados</span>
          <Button
            size="sm"
            onClick={handleBatchRetry}
            disabled={loading}
            variant="primary"
          >
            Tentar Novamente ({selectedItems.size})
          </Button>
          <Button
            size="sm"
            onClick={handleBatchClear}
            disabled={loading}
            variant="secondary"
          >
            Limpar ({selectedItems.size})
          </Button>
        </div>
      )}

      {/* Table */}
      {loading && items.length === 0 ? (
        <PageLoader message="Carregando itens da DLQ..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MailX size={48} />}
          title="Nenhum item na DLQ"
          description={total === 0 ? "Todos os webhooks foram entregues com sucesso!" : "Nenhum resultado encontrado para os filtros atuais."}
          variant="default"
        />
      ) : (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleAllItems}
                    aria-label="Select all items"
                    className="cursor-pointer"
                  />
                </TableHead>
                <TableHead>URL Webhook</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="text-center">Tentativas</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último Erro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-primary-50' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      aria-label={`Select ${item.id}`}
                      className="cursor-pointer"
                    />
                  </TableCell>
                  <TableCell
                    className="font-mono text-sm max-w-xs truncate cursor-pointer text-primary-600 hover:underline"
                    onClick={() => onSelectItem?.(item)}
                    title={item.webhookUrl}
                  >
                    {formatUrl(item.webhookUrl)}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-error-600 max-w-xs truncate" title={item.lastError}>
                    {truncateError(item.lastError, 80)}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-warning-600">{item.retryCount}</TableCell>
                  <TableCell className="text-xs text-neutral-600">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-xs text-neutral-600">{formatDate(item.lastErrorAt)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      onClick={() => handleRetry(item.id)}
                      disabled={loading}
                      title="Tentar entregar webhook novamente"
                    >
                      Tentar Novamente
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleClear(item.id)}
                      disabled={loading}
                      title="Limpar da DLQ"
                    >
                      Limpar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectItem?.(item)}
                      title="Ver detalhes"
                    >
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <span className="text-sm text-neutral-600 min-w-48 text-center">
            Página {page} de {Math.ceil(total / PAGE_SIZE)} ({total} total)
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={!hasMore || loading}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
};

export default DLQTable;
