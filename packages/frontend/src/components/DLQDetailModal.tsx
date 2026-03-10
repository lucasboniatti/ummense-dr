/**
 * DLQDetailModal Component - Show detailed DLQ item information
 * Story 3.2: Webhook Reliability & Retry Logic
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Copy, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
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

  if (!dlqItem) {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Item da DLQ</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 bg-error-100 border border-error-400 text-error-700 rounded-md text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-error-700 hover:text-error-900" aria-label="Fechar erro">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-100 rounded-lg">
            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">URL Webhook</p>
              <p className="text-sm font-mono truncate" title={dlqItem.webhookUrl}>{dlqItem.webhookUrl}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(dlqItem.webhookUrl)}
                className="mt-1 h-8 w-8 rounded-full text-neutral-600"
                title="Copiar URL"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">DLQ ID</p>
              <p className="text-sm font-mono truncate" title={dlqItem.id}>{dlqItem.id}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(dlqItem.id)}
                className="mt-1 h-8 w-8 rounded-full text-neutral-600"
                title="Copiar ID"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">Tentativas</p>
              <p className="text-lg font-bold text-warning-600">{dlqItem.retryCount} / 5</p>
            </div>

            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">Status</p>
              <Badge variant={dlqItem.clearedAt ? 'success' : 'destructive'}>
                <span className="inline-flex items-center gap-1.5">
                  {dlqItem.clearedAt ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  )}
                  {dlqItem.clearedAt ? 'Limpo' : 'Na DLQ'}
                </span>
              </Badge>
            </div>

            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">Criado em</p>
              <p className="text-sm">{formatDate(dlqItem.createdAt)}</p>
            </div>

            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">Último Erro</p>
              <p className="text-sm">{formatDate(dlqItem.lastErrorAt)}</p>
            </div>
          </div>

          {/* Error Message Section */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('error')}
              className="w-full px-4 py-2 bg-neutral-100 text-left font-semibold text-neutral-900 hover:bg-neutral-200 flex items-center gap-2"
            >
              {expandedSections.has('error') ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Mensagem de Erro</span>
            </button>
            {expandedSections.has('error') && (
              <div className="p-4 bg-warning-50 border-t border-warning-200">
                <p className="text-sm font-mono text-warning-900 whitespace-pre-wrap mb-2">{dlqItem.lastError}</p>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(dlqItem.lastError)}
                >
                  Copiar Erro
                </Button>
              </div>
            )}
          </div>

          {/* Payload Section */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('payload')}
              className="w-full px-4 py-2 bg-neutral-100 text-left font-semibold text-neutral-900 hover:bg-neutral-200 flex items-center gap-2"
            >
              {expandedSections.has('payload') ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Payload do Webhook</span>
            </button>
            {expandedSections.has('payload') && (
              <div className="p-4 bg-neutral-50">
                <pre className="text-xs bg-neutral-900 text-neutral-100 p-3 rounded overflow-x-auto mb-2">
                  <code>{formatJson(dlqItem.payload)}</code>
                </pre>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(formatJson(dlqItem.payload))}
                >
                  Copiar Payload
                </Button>
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('metadata')}
              className="w-full px-4 py-2 bg-neutral-100 text-left font-semibold text-neutral-900 hover:bg-neutral-200 flex items-center gap-2"
            >
              {expandedSections.has('metadata') ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Metadados</span>
            </button>
            {expandedSections.has('metadata') && (
              <div className="p-4 space-y-2">
                <div className="text-sm"><span className="font-semibold">ID Automação:</span> <span className="font-mono">{dlqItem.automationId}</span></div>
                <div className="text-sm"><span className="font-semibold">ID Entrega:</span> <span className="font-mono">{dlqItem.webhookDeliveryId}</span></div>
                <div className="text-sm"><span className="font-semibold">Criado em:</span> {new Date(dlqItem.createdAt).toLocaleString()}</div>
                <div className="text-sm"><span className="font-semibold">Último Erro:</span> {new Date(dlqItem.lastErrorAt).toLocaleString()}</div>
                {dlqItem.clearedAt && <div className="text-sm"><span className="font-semibold">Limpo em:</span> {new Date(dlqItem.clearedAt).toLocaleString()}</div>}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Fechar
          </Button>
          {!dlqItem.clearedAt && (
            <>
              <Button onClick={handleRetry} disabled={loading}>
                {loading ? 'Tentando...' : 'Tentar Novamente'}
              </Button>
              <Button variant="secondary" onClick={handleClear} disabled={loading}>
                {loading ? 'Limpando...' : 'Limpar da DLQ'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DLQDetailModal;
