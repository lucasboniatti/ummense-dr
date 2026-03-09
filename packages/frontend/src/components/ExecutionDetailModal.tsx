import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Badge } from './ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from './ui/Dialog';

interface ExecutionTrace {
  rule_id: string;
  rule_name: string;
  webhook_id: string;
  webhook_url: string;
  triggered_at: string;
  status: 'success' | 'failed' | 'pending';
  execution_time_ms: number;
  rule_config?: Record<string, any>;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  error_trace?: string;
  retry_history?: Array<{
    attempt: number;
    status: string;
    timestamp: string;
    error?: string;
  }>;
}

interface ExecutionDetailModalProps {
  execution: ExecutionTrace;
  isOpen?: boolean;
  onClose?: () => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

export const ExecutionDetailModal: React.FC<ExecutionDetailModalProps> = ({ execution, isOpen = true, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['config']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const content = (
    <div className="space-y-4">
      {/* Header Summary */}
      <Card className={`border-2 ${execution.status === 'success' ? 'border-success-300' : execution.status === 'failed' ? 'border-error-300' : 'border-warning-300'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{execution.rule_name}</CardTitle>
            <Badge variant={getStatusVariant(execution.status)}>
              {execution.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">Duração</p>
              <p className="font-semibold">{execution.execution_time_ms}ms</p>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-neutral-700">Disparo em</p>
              <p className="text-xs">{new Date(execution.triggered_at).toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase font-semibold text-neutral-700">Webhook</p>
              <p className="font-mono text-xs truncate">{execution.webhook_url}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule Config */}
      {execution.rule_config && (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('config')}
            className="w-full px-4 py-2 bg-neutral-100 text-left font-semibold text-neutral-900 hover:bg-neutral-200 flex items-center gap-2"
          >
            <span>{expandedSections.has('config') ? '▼' : '▶'}</span>
            <span>Configuração da Regra</span>
          </button>
          {expandedSections.has('config') && (
            <div className="p-4 bg-neutral-50">
              <pre className="text-xs bg-neutral-900 text-neutral-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(execution.rule_config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Conditions */}
      {execution.conditions && (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('conditions')}
            className="w-full px-4 py-2 bg-neutral-100 text-left font-semibold text-neutral-900 hover:bg-neutral-200 flex items-center gap-2"
          >
            <span>{expandedSections.has('conditions') ? '▼' : '▶'}</span>
            <span>Condições Avaliadas</span>
          </button>
          {expandedSections.has('conditions') && (
            <div className="p-4 bg-neutral-50">
              <pre className="text-xs bg-neutral-900 text-neutral-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(execution.conditions, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Actions Taken */}
      {execution.actions && (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('actions')}
            className="w-full px-4 py-2 bg-neutral-100 text-left font-semibold text-neutral-900 hover:bg-neutral-200 flex items-center gap-2"
          >
            <span>{expandedSections.has('actions') ? '▼' : '▶'}</span>
            <span>Ações Executadas</span>
          </button>
          {expandedSections.has('actions') && (
            <div className="p-4 bg-neutral-50">
              <pre className="text-xs bg-neutral-900 text-neutral-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(execution.actions, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error Trace */}
      {execution.error_trace && (
        <div className="border-2 border-error-300 bg-error-50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('error')}
            className="w-full px-4 py-2 bg-error-100 text-left font-semibold text-error-900 hover:bg-error-200 flex items-center gap-2"
          >
            <span>{expandedSections.has('error') ? '▼' : '▶'}</span>
            <span>Detalhes do Erro</span>
          </button>
          {expandedSections.has('error') && (
            <div className="p-4">
              <pre className="text-xs bg-neutral-900 text-error-100 p-3 rounded overflow-x-auto">
                {execution.error_trace}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Retry History */}
      {execution.retry_history && execution.retry_history.length > 0 && (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('retry')}
            className="w-full px-4 py-2 bg-neutral-100 text-left font-semibold text-neutral-900 hover:bg-neutral-200 flex items-center gap-2"
          >
            <span>{expandedSections.has('retry') ? '▼' : '▶'}</span>
            <span>Histórico de Tentativas ({execution.retry_history.length})</span>
          </button>
          {expandedSections.has('retry') && (
            <div className="p-4 space-y-3">
              {execution.retry_history.map((attempt, idx) => (
                <div key={idx} className="border border-neutral-200 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Tentativa {attempt.attempt}</span>
                    <Badge variant={attempt.status === 'success' ? 'success' : 'destructive'}>
                      {attempt.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600">{new Date(attempt.timestamp).toLocaleString()}</p>
                  {attempt.error && <p className="text-xs text-error-700 mt-1">{attempt.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // If used as a dialog
  if (isOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{execution.rule_name} - Detalhes da Execução</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {content}
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }

  // If used as inline content
  return content;
};
