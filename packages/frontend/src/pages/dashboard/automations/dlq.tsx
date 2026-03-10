/**
 * DLQ Dashboard Page
 * Story 3.2: Webhook Reliability & Retry Logic
 * Manage Dead Letter Queue items for failed webhook deliveries
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle2, X } from 'lucide-react';
import DLQTable from '../../../components/DLQTable';
import DLQDetailModal from '../../../components/DLQDetailModal';
import { DLQService, DLQItem, DLQStats } from '../../../services/dlq.service';

interface DLQDashboardPageProps {
  automationId?: string;
}

export default function DLQDashboardPage({ automationId: propAutomationId }: DLQDashboardPageProps) {
  const router = useRouter();
  const [automationId, setAutomationId] = useState<string>('');
  const [stats, setStats] = useState<DLQStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<DLQItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dlqService = new DLQService();

  // Get automation ID from props or router
  useEffect(() => {
    const id = propAutomationId || (router.query.automationId as string);
    if (id) {
      setAutomationId(id);
      loadStats(id);
    }
  }, [propAutomationId, router.query.automationId]);

  const loadStats = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dlqService.getDLQStats(id);
      setStats(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load statistics';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: DLQItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedItem(null);
  };

  const handleItemRetry = (dlqItemId: string) => {
    // Refresh stats after retry
    if (automationId) {
      loadStats(automationId);
    }
  };

  const handleItemClear = (dlqItemId: string) => {
    // Refresh stats after clear
    if (automationId) {
      loadStats(automationId);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString();
  };

  if (!automationId) {
    return (
      <div className="dlq-page">
        <div className="error-state">
          <h2>Automation Not Found</h2>
          <p>Please select an automation to view its DLQ.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dlq-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Dead Letter Queue (DLQ)</h1>
          <p className="subtitle">
            Manage webhook deliveries that failed after all retry attempts
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-btn" aria-label="Fechar alerta">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalItems}</div>
            <div className="stat-label">Items in DLQ</div>
            <div className="stat-subtext">Awaiting manual review</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.averageRetriesPerItem}</div>
            <div className="stat-label">Avg Retry Attempts</div>
            <div className="stat-subtext">Per failed webhook</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {stats.oldestItem ? <CheckCircle2 className="inline h-7 w-7" aria-hidden="true" /> : '—'}
            </div>
            <div className="stat-label">Oldest Item</div>
            <div className="stat-subtext">{formatDate(stats.oldestItem)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">
              {stats.newestItem ? <CheckCircle2 className="inline h-7 w-7" aria-hidden="true" /> : '—'}
            </div>
            <div className="stat-label">Newest Item</div>
            <div className="stat-subtext">{formatDate(stats.newestItem)}</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && stats === null && (
        <div className="loading-state">
          <p>Loading DLQ statistics...</p>
        </div>
      )}

      {/* DLQ Table */}
      {stats && (
        <DLQTable
          automationId={automationId}
          onSelectItem={handleSelectItem}
          onRetry={handleItemRetry}
          onClear={handleItemClear}
        />
      )}

      {/* Detail Modal */}
      <DLQDetailModal
        dlqItem={selectedItem}
        automationId={automationId}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onRetry={handleItemRetry}
        onClear={handleItemClear}
      />

      {/* Help Section */}
      <div className="help-section">
        <h3>About Dead Letter Queue</h3>
        <div className="help-content">
          <p>
            The Dead Letter Queue (DLQ) stores webhook deliveries that failed after all automatic
            retry attempts. Each webhook delivery attempts up to 5 times with exponential backoff:
          </p>
          <ul className="backoff-list">
            <li>
              <strong>Attempt 1:</strong> 1 second delay
            </li>
            <li>
              <strong>Attempt 2:</strong> 5 seconds delay
            </li>
            <li>
              <strong>Attempt 3:</strong> 30 seconds delay
            </li>
            <li>
              <strong>Attempt 4:</strong> 5 minutes delay
            </li>
            <li>
              <strong>Attempt 5:</strong> 30 minutes delay
            </li>
          </ul>
          <p>
            If delivery still fails after attempt 5, the webhook is moved to the DLQ for manual
            review. You can:
          </p>
          <ul className="action-list">
            <li>
              <strong>Retry:</strong> Reset the retry count and attempt delivery again from attempt
              1
            </li>
            <li>
              <strong>Clear:</strong> Mark the webhook as reviewed and remove it from the DLQ
            </li>
            <li>
              <strong>View Details:</strong> See the full error message, payload, and metadata
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .dlq-page {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          background: #f5f5f5;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 32px;
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-content h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          color: #333;
        }

        .subtitle {
          margin: 0;
          font-size: 16px;
          color: #666;
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #0066cc;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .stat-subtext {
          font-size: 12px;
          color: #999;
        }

        .loading-state {
          background: white;
          padding: 40px 20px;
          text-align: center;
          border-radius: 8px;
          color: #666;
        }

        .error-state {
          background: white;
          padding: 40px 20px;
          text-align: center;
          border-radius: 8px;
          color: #c33;
        }

        .error-state h2 {
          margin: 0 0 12px 0;
          font-size: 20px;
        }

        .error-state p {
          margin: 0;
          font-size: 14px;
        }

        .help-section {
          background: white;
          padding: 24px;
          border-radius: 8px;
          margin-top: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .help-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #333;
        }

        .help-content p {
          margin: 0 0 12px 0;
          font-size: 14px;
          line-height: 1.6;
          color: #666;
        }

        .help-content p:last-of-type {
          margin-bottom: 12px;
        }

        .backoff-list {
          list-style: none;
          padding: 0;
          margin: 0 0 16px 0;
          background: #f9f9f9;
          padding: 12px 16px;
          border-radius: 4px;
          border-left: 3px solid #0066cc;
        }

        .backoff-list li {
          font-size: 13px;
          margin-bottom: 8px;
          color: #555;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .backoff-list li:last-child {
          margin-bottom: 0;
        }

        .action-list {
          list-style: none;
          padding: 0;
          margin: 12px 0;
        }

        .action-list li {
          font-size: 14px;
          margin-bottom: 8px;
          padding-left: 24px;
          position: relative;
          color: #666;
        }

        .action-list li::before {
          content: '•';
          position: absolute;
          left: 8px;
        }

        .action-list li:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}

export const getServerSideProps = async (context: any) => {
  // Get automation ID from query params
  const { automationId } = context.query;

  return {
    props: {
      automationId: automationId || null
    }
  };
};
