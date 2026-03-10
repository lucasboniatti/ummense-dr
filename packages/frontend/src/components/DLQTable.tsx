/**
 * DLQTable Component - Display Dead Letter Queue items
 * Story 3.2: Webhook Reliability & Retry Logic
 */

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './composite/Table';
import {
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  PageLoader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui';
import { MailX } from 'lucide-react';
import { DLQService, DLQItem } from '../services/dlq.service';

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
  onSelectItem,
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
  const [clearConfirm, setClearConfirm] = useState<{
    open: boolean;
    ids: string[];
    label: string;
  }>({
    open: false,
    ids: [],
    label: '',
  });

  const dlqService = new DLQService();
  const PAGE_SIZE = 20;

  useEffect(() => {
    void fetchItems();
  }, [page, sortBy, sortOrder, filterError, filterUrl]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await dlqService.queryDLQ(
        automationId,
        {
          webhookUrl: filterUrl || undefined,
          errorContains: filterError || undefined,
        },
        {
          page,
          limit: PAGE_SIZE,
          sortBy,
          sortOrder,
        }
      );

      setItems(result.items);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar itens da DLQ');
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
      setError(err instanceof Error ? err.message : 'Falha ao tentar novamente');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchRetry = async () => {
    if (selectedItems.size === 0) {
      return;
    }

    try {
      setLoading(true);
      const result = await dlqService.batchRetryDLQ(automationId, Array.from(selectedItems));
      if (result.summary.failed > 0) {
        setError(`Retry failed for ${result.summary.failed} items`);
      }
      setSelectedItems(new Set());
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no retry em lote');
    } finally {
      setLoading(false);
    }
  };

  const handleClearConfirmed = async () => {
    const ids = clearConfirm.ids;
    if (ids.length === 0) {
      return;
    }

    try {
      setLoading(true);

      if (ids.length === 1) {
        await dlqService.clearDLQItem(automationId, ids[0]);
        onClear?.(ids[0]);
      } else {
        const result = await dlqService.batchClearDLQ(automationId, ids);
        if (result.summary.failed > 0) {
          setError(`Clear failed for ${result.summary.failed} items`);
        }
      }

      setSelectedItems(new Set());
      setClearConfirm({ open: false, ids: [], label: '' });
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na limpeza da DLQ');
    } finally {
      setLoading(false);
    }
  };

  const requestClear = (ids: string[], label: string) => {
    setClearConfirm({ open: true, ids, label });
  };

  const toggleItem = (dlqItemId: string) => {
    const nextSelected = new Set(selectedItems);
    if (nextSelected.has(dlqItemId)) {
      nextSelected.delete(dlqItemId);
    } else {
      nextSelected.add(dlqItemId);
    }
    setSelectedItems(nextSelected);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
      return;
    }

    setSelectedItems(new Set(items.map((item) => item.id)));
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('pt-BR');

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const truncateError = (message: string, maxLength: number = 100) =>
    message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;

  return (
    <div className="space-y-4">
      {error && (
        <ErrorBanner
          title="Falha na DLQ"
          message={error}
          actionLabel="Dispensar"
          onAction={() => setError(null)}
        />
      )}

      <div className="app-surface-muted grid grid-cols-1 gap-3 rounded-[20px] p-4 md:grid-cols-4">
        <div>
          <label htmlFor="filter-url" className="mb-1 block text-sm font-semibold text-neutral-700">
            Webhook URL
          </label>
          <Input
            id="filter-url"
            type="text"
            placeholder="Filtrar por URL..."
            value={filterUrl}
            onChange={(event) => {
              setFilterUrl(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div>
          <label htmlFor="filter-error" className="mb-1 block text-sm font-semibold text-neutral-700">
            Mensagem de erro
          </label>
          <Input
            id="filter-error"
            type="text"
            placeholder="Filtrar por erro..."
            value={filterError}
            onChange={(event) => {
              setFilterError(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">Ordenar por</label>
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value as 'createdAt' | 'lastErrorAt');
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um campo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Data de criação</SelectItem>
              <SelectItem value="lastErrorAt">Último erro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-neutral-700">Ordem</label>
          <Select
            value={sortOrder}
            onValueChange={(value) => {
              setSortOrder(value as 'asc' | 'desc');
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a ordem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Mais recentes</SelectItem>
              <SelectItem value="asc">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
          <span className="flex-1 font-semibold text-primary-900">
            {selectedItems.size} itens selecionados
          </span>
          <Button size="sm" onClick={handleBatchRetry} disabled={loading} variant="primary">
            Tentar novamente ({selectedItems.size})
          </Button>
          <Button
            size="sm"
            onClick={() =>
              requestClear(
                Array.from(selectedItems),
                `${selectedItems.size} item(ns) serão removidos da DLQ.`
              )
            }
            disabled={loading}
            variant="destructive"
          >
            Limpar ({selectedItems.size})
          </Button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <PageLoader message="Carregando itens da DLQ..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MailX size={48} />}
          title="Nenhum item na DLQ"
          description={
            total === 0
              ? 'Todos os webhooks foram entregues com sucesso!'
              : 'Nenhum resultado encontrado para os filtros atuais.'
          }
          variant="default"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedItems.size === items.length && items.length > 0}
                    onCheckedChange={toggleAllItems}
                    aria-label="Selecionar todos os itens"
                  />
                </TableHead>
                <TableHead>URL webhook</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="text-center">Tentativas</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último erro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-primary-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                      aria-label={`Selecionar ${item.id}`}
                    />
                  </TableCell>
                  <TableCell
                    className="max-w-xs cursor-pointer truncate font-mono text-sm text-primary-600 hover:underline"
                    onClick={() => onSelectItem?.(item)}
                    title={item.webhookUrl}
                  >
                    {formatUrl(item.webhookUrl)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-sm text-error-600" title={item.lastError}>
                    {truncateError(item.lastError, 80)}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-warning-600">
                    {item.retryCount}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-600">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-xs text-neutral-600">{formatDate(item.lastErrorAt)}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleRetry(item.id)}
                      disabled={loading}
                      title="Tentar entregar webhook novamente"
                    >
                      Tentar novamente
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        requestClear(
                          [item.id],
                          `O item ${formatUrl(item.webhookUrl)} será removido da DLQ.`
                        )
                      }
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

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <span className="min-w-48 text-center text-sm text-neutral-600">
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

      <ConfirmDialog
        open={clearConfirm.open}
        onOpenChange={(open) => setClearConfirm((previous) => ({ ...previous, open }))}
        title={clearConfirm.ids.length > 1 ? 'Limpar itens da DLQ' : 'Limpar item da DLQ'}
        description={clearConfirm.label}
        confirmLabel={clearConfirm.ids.length > 1 ? 'Limpar itens' : 'Limpar item'}
        cancelLabel="Cancelar"
        variant="danger"
        loading={loading}
        onConfirm={handleClearConfirmed}
      />
    </div>
  );
};

export default DLQTable;
