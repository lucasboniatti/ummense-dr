/**
 * DLQTable Component - Display Dead Letter Queue items
 * Story 3.2: Webhook Reliability & Retry Logic
 */

import React, { useState, useEffect } from 'react';
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
      const message = err instanceof Error ? err.message : 'Failed to load DLQ items';
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
      const message = err instanceof Error ? err.message : 'Failed to retry';
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
      const message = err instanceof Error ? err.message : 'Failed to clear';
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
      const message = err instanceof Error ? err.message : 'Batch retry failed';
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
      const message = err instanceof Error ? err.message : 'Batch clear failed';
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
    <div className="dlq-table-container">
      {/* Error Message */}
      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-btn">
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="filter-url">Webhook URL:</label>
          <input
            id="filter-url"
            type="text"
            placeholder="Filter by webhook URL..."
            value={filterUrl}
            onChange={(e) => {
              setFilterUrl(e.target.value);
              setPage(1);
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-error">Error Message:</label>
          <input
            id="filter-error"
            type="text"
            placeholder="Filter by error..."
            value={filterError}
            onChange={(e) => {
              setFilterError(e.target.value);
              setPage(1);
            }}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="sort-by">Sort By:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'createdAt' | 'lastErrorAt');
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="createdAt">Created Date</option>
            <option value="lastErrorAt">Last Error Date</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-order">Order:</label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'asc' | 'desc');
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedItems.size > 0 && (
        <div className="batch-actions">
          <span className="selected-count">{selectedItems.size} items selected</span>
          <button onClick={handleBatchRetry} disabled={loading} className="btn btn-primary">
            Retry Selected ({selectedItems.size})
          </button>
          <button onClick={handleBatchClear} disabled={loading} className="btn btn-secondary">
            Clear Selected ({selectedItems.size})
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        {loading && items.length === 0 ? (
          <div className="loading">Loading DLQ items...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>No DLQ items found</p>
            {total === 0 && <small>All webhooks delivered successfully!</small>}
          </div>
        ) : (
          <table className="dlq-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleAllItems}
                    aria-label="Select all items"
                  />
                </th>
                <th>Webhook URL</th>
                <th>Error</th>
                <th>Attempts</th>
                <th>Created</th>
                <th>Last Error</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={selectedItems.has(item.id) ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      aria-label={`Select ${item.id}`}
                    />
                  </td>
                  <td
                    className="webhook-url"
                    onClick={() => onSelectItem?.(item)}
                    title={item.webhookUrl}
                  >
                    {formatUrl(item.webhookUrl)}
                  </td>
                  <td className="error-message" title={item.lastError}>
                    {truncateError(item.lastError)}
                  </td>
                  <td className="retry-count">{item.retryCount}</td>
                  <td className="date">{formatDate(item.createdAt)}</td>
                  <td className="date">{formatDate(item.lastErrorAt)}</td>
                  <td className="actions">
                    <button
                      onClick={() => handleRetry(item.id)}
                      disabled={loading}
                      className="btn btn-small btn-primary"
                      title="Retry webhook delivery"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => handleClear(item.id)}
                      disabled={loading}
                      className="btn btn-small btn-secondary"
                      title="Clear from DLQ"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => onSelectItem?.(item)}
                      className="btn btn-small btn-info"
                      title="View details"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="pagination">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            className="btn btn-small"
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {Math.ceil(total / PAGE_SIZE)} ({total} total)
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!hasMore || loading}
            className="btn btn-small"
          >
            Next
          </button>
        </div>
      )}

      <style jsx>{`
        .dlq-table-container {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .alert {
          padding: 12px 16px;
          margin-bottom: 16px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-error {
          background-color: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          margin: -4px;
        }

        .filters-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          color: #333;
        }

        .filter-input,
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .batch-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .selected-count {
          font-weight: 600;
          color: #666;
          flex: 1;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .dlq-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .dlq-table thead {
          background-color: #f5f5f5;
          border-bottom: 2px solid #ddd;
        }

        .dlq-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
        }

        .dlq-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .dlq-table tbody tr:hover {
          background-color: #f9f9f9;
        }

        .dlq-table tbody tr.selected {
          background-color: #e8f4f8;
        }

        .webhook-url {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: pointer;
          color: #0066cc;
        }

        .webhook-url:hover {
          text-decoration: underline;
        }

        .error-message {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #c33;
          font-family: monospace;
          font-size: 12px;
        }

        .retry-count {
          text-align: center;
          font-weight: 600;
          color: #f59e0b;
        }

        .date {
          font-size: 13px;
          color: #666;
          white-space: nowrap;
        }

        .actions {
          display: flex;
          gap: 6px;
          min-width: 200px;
        }

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-small {
          padding: 4px 8px;
          font-size: 12px;
        }

        .btn-primary {
          background-color: #0066cc;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0052a3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #5a6268;
        }

        .btn-info {
          background-color: #17a2b8;
          color: white;
        }

        .btn-info:hover:not(:disabled) {
          background-color: #138496;
        }

        .loading,
        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #666;
        }

        .empty-state small {
          display: block;
          margin-top: 8px;
          font-size: 12px;
          color: #999;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }

        .page-info {
          font-size: 13px;
          color: #666;
          min-width: 200px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default DLQTable;
