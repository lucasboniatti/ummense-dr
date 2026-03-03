/**
 * DLQDetailModal Component - Show detailed DLQ item information
 * Story 3.2: Webhook Reliability & Retry Logic
 */

import React, { useState } from 'react';
import { DLQItem, DLQService } from '../services/dlq.service';

interface DLQDetailModalProps {
  dlqItem: DLQItem | null;
  automationId: string;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (dlqItemId: string) => void;
  onClear?: (dlqItemId: string) => void;
}

export const DLQDetailModal: React.FC<DLQDetailModalProps> = ({
  dlqItem,
  automationId,
  isOpen,
  onClose,
  onRetry,
  onClear
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['payload']));

  const dlqService = new DLQService();

  if (!isOpen || !dlqItem) {
    return null;
  }

  const handleRetry = async () => {
    try {
      setLoading(true);
      setError(null);
      await dlqService.retryDLQItem(automationId, dlqItem.id);
      onRetry?.(dlqItem.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      setLoading(true);
      setError(null);
      await dlqService.clearDLQItem(automationId, dlqItem.id);
      onClear?.(dlqItem.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>DLQ Item Details</h2>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">
            ×
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="close-btn">
              ×
            </button>
          </div>
        )}

        <div className="modal-body">
          {/* Summary Section */}
          <div className="summary-section">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Webhook URL</span>
                <span className="value monospace truncate" title={dlqItem.webhookUrl}>
                  {dlqItem.webhookUrl}
                </span>
                <button
                  onClick={() => copyToClipboard(dlqItem.webhookUrl)}
                  className="copy-btn"
                  title="Copy URL"
                >
                  📋
                </button>
              </div>

              <div className="summary-item">
                <span className="label">DLQ Item ID</span>
                <span className="value monospace truncate" title={dlqItem.id}>
                  {dlqItem.id}
                </span>
                <button
                  onClick={() => copyToClipboard(dlqItem.id)}
                  className="copy-btn"
                  title="Copy ID"
                >
                  📋
                </button>
              </div>

              <div className="summary-item">
                <span className="label">Retry Attempts</span>
                <span className="value attention">{dlqItem.retryCount} / 5</span>
              </div>

              <div className="summary-item">
                <span className="label">Created</span>
                <span className="value">{formatDate(dlqItem.createdAt)}</span>
              </div>

              <div className="summary-item">
                <span className="label">Last Error</span>
                <span className="value">{formatDate(dlqItem.lastErrorAt)}</span>
              </div>

              <div className="summary-item">
                <span className="label">Status</span>
                <span className="value status">
                  {dlqItem.clearedAt ? '✓ Cleared' : '⚠ In DLQ'}
                </span>
              </div>
            </div>
          </div>

          {/* Expandable Sections */}

          {/* Error Context Section */}
          <div className="expandable-section">
            <button
              onClick={() => toggleSection('error')}
              className="section-header"
              aria-expanded={expandedSections.has('error')}
            >
              <span className="toggle-icon">{expandedSections.has('error') ? '▼' : '▶'}</span>
              <span className="title">Error Message</span>
            </button>
            {expandedSections.has('error') && (
              <div className="section-content">
                <div className="error-box">
                  <p className="error-text">{dlqItem.lastError}</p>
                  <button
                    onClick={() => copyToClipboard(dlqItem.lastError)}
                    className="copy-btn-large"
                  >
                    Copy Error
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payload Section */}
          <div className="expandable-section">
            <button
              onClick={() => toggleSection('payload')}
              className="section-header"
              aria-expanded={expandedSections.has('payload')}
            >
              <span className="toggle-icon">{expandedSections.has('payload') ? '▼' : '▶'}</span>
              <span className="title">Webhook Payload</span>
            </button>
            {expandedSections.has('payload') && (
              <div className="section-content">
                <pre className="code-block">
                  <code>{formatJson(dlqItem.payload)}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(formatJson(dlqItem.payload))}
                  className="copy-btn-large"
                >
                  Copy Payload
                </button>
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div className="expandable-section">
            <button
              onClick={() => toggleSection('metadata')}
              className="section-header"
              aria-expanded={expandedSections.has('metadata')}
            >
              <span className="toggle-icon">{expandedSections.has('metadata') ? '▼' : '▶'}</span>
              <span className="title">Metadata</span>
            </button>
            {expandedSections.has('metadata') && (
              <div className="section-content">
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="key">Automation ID</span>
                    <span className="value monospace">{dlqItem.automationId}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="key">Webhook Delivery ID</span>
                    <span className="value monospace">{dlqItem.webhookDeliveryId}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="key">Created At</span>
                    <span className="value">{new Date(dlqItem.createdAt).toISOString()}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="key">Last Error At</span>
                    <span className="value">{new Date(dlqItem.lastErrorAt).toISOString()}</span>
                  </div>
                  {dlqItem.clearedAt && (
                    <div className="metadata-item">
                      <span className="key">Cleared At</span>
                      <span className="value">{new Date(dlqItem.clearedAt).toISOString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary" disabled={loading}>
            Close
          </button>
          {!dlqItem.clearedAt && (
            <>
              <button onClick={handleRetry} className="btn btn-primary" disabled={loading}>
                {loading ? 'Retrying...' : 'Retry Webhook'}
              </button>
              <button onClick={handleClear} className="btn btn-secondary" disabled={loading}>
                {loading ? 'Clearing...' : 'Clear from DLQ'}
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          max-width: 800px;
          width: 90%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #ddd;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          margin: -8px;
          color: #666;
        }

        .close-btn:hover {
          color: #333;
        }

        .alert {
          margin: 0;
          padding: 12px 20px;
          background-color: #fee;
          color: #c33;
          border-bottom: 1px solid #fcc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .summary-section {
          margin-bottom: 24px;
          padding: 16px;
          background-color: #f5f5f5;
          border-radius: 6px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-item .label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
        }

        .summary-item .value {
          font-size: 14px;
          color: #333;
          word-break: break-word;
        }

        .summary-item .attention {
          color: #f59e0b;
          font-weight: 600;
        }

        .summary-item .status {
          font-weight: 600;
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .monospace {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          background-color: white;
          padding: 4px 8px;
          border-radius: 3px;
          border: 1px solid #ddd;
        }

        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          margin-top: 4px;
          text-align: left;
        }

        .copy-btn:hover {
          opacity: 0.7;
        }

        .expandable-section {
          margin-bottom: 16px;
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: hidden;
        }

        .section-header {
          width: 100%;
          padding: 12px 16px;
          background-color: #f9f9f9;
          border: none;
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #333;
          transition: background-color 0.2s;
        }

        .section-header:hover {
          background-color: #f0f0f0;
        }

        .toggle-icon {
          display: inline-block;
          width: 16px;
          text-align: center;
          font-size: 12px;
        }

        .section-content {
          padding: 16px;
          background: white;
          border-top: 1px solid #eee;
        }

        .error-box {
          background-color: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .error-text {
          margin: 0;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          color: #856404;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .code-block {
          background-color: #f4f4f4;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 12px;
          overflow-x: auto;
          margin: 0 0 12px 0;
          font-size: 12px;
          line-height: 1.4;
        }

        .code-block code {
          font-family: 'Monaco', 'Courier New', monospace;
          color: #333;
        }

        .copy-btn-large {
          padding: 8px 16px;
          background-color: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .copy-btn-large:hover {
          background-color: #0052a3;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
          background-color: #f9f9f9;
          border-radius: 4px;
          border: 1px solid #eee;
        }

        .metadata-item .key {
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }

        .metadata-item .value {
          font-size: 13px;
          color: #333;
          word-break: break-all;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 20px;
          border-top: 1px solid #ddd;
          background-color: #f9f9f9;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
      `}</style>
    </div>
  );
};

export default DLQDetailModal;
