import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { webhookService } from '../services/webhook.service';
import { ResponseInspector } from './ResponseInspector';

interface TestWebhookModalProps {
  webhookId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TestResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: string;
  elapsed: number;
}

const samplePayloads = {
  'task:created': {
    event_type: 'task:created',
    data: {
      id: 'task-sample-123',
      title: 'Sample Task',
      status: 'todo',
      priority: 'medium',
      createdAt: new Date().toISOString(),
    },
  },
  'rule:executed': {
    event_type: 'rule:executed',
    data: {
      rule_id: 'rule-sample-456',
      rule_name: 'Sample Rule',
      execution_status: 'success',
      duration_ms: 125,
      matched_count: 3,
    },
  },
  'webhook:triggered': {
    event_type: 'webhook:triggered',
    data: {
      webhook_id: 'webhook-sample-789',
      delivery_status: 'success',
      attempt: 1,
      response_time_ms: 450,
    },
  },
};

export const TestWebhookModal: React.FC<TestWebhookModalProps> = ({
  webhookId,
  isOpen,
  onClose,
}) => {
  const [eventType, setEventType] = useState<keyof typeof samplePayloads>(
    'task:created'
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await webhookService.testWebhook(webhookId, {
        event_type: eventType,
      });
      setResponse(result);
      setShowInspector(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Testar Webhook</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Event Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Evento
            </label>
            <select
              value={eventType}
              onChange={(e) =>
                setEventType(e.target.value as keyof typeof samplePayloads)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="task:created">Task Criada</option>
              <option value="rule:executed">Regra Executada</option>
              <option value="webhook:triggered">Webhook Disparado</option>
            </select>
          </div>

          {/* Sample Payload Preview */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payload de Exemplo
            </label>
            <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto max-h-48 font-mono">
              {JSON.stringify(samplePayloads[eventType], null, 2)}
            </pre>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex gap-2 text-sm text-red-800">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Message */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            Este webhook será disparado imediatamente, sem passar pela fila. Você poderá visualizar
            a resposta completa do servidor.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Testar
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Response Inspector */}
      {showInspector && response && (
        <ResponseInspector
          response={response}
          onClose={() => {
            setShowInspector(false);
            setResponse(null);
          }}
        />
      )}
    </>
  );
};
