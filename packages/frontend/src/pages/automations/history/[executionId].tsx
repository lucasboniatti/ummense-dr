import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiClient } from '../../../services/api.client';
import { PageLoader } from '../../../components/ui/PageLoader';

interface ExecutionStep {
  id: string;
  step_id: string;
  status: string;
  input: any;
  output?: any;
  error_message?: string;
  error_context?: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

interface ExecutionDetail {
  id: string;
  automation_id: string;
  automation_name: string;
  status: string;
  trigger_type: string;
  trigger_data: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_context?: any;
  created_at: string;
}

export default function ExecutionDetailPage() {
  const router = useRouter();
  const { executionId } = router.query;

  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    if (!executionId) return;

    const fetchDetail = async () => {
      try {
        const { data } = await apiClient.get(`/automations/history/${executionId}`);
        setExecution(data.execution);
        setSteps(data.steps);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [executionId]);

  if (loading) {
    return <PageLoader message="Carregando detalhes da execução..." />;
  }

  if (error || !execution) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-800 mb-4"
          >
            ← Voltar
          </button>
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">{error || 'Execução não encontrada'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-50 border-success-200';
      case 'failed':
        return 'bg-error-50 border-error-200';
      default:
        return 'bg-neutral-50 border-neutral-200';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✗';
      case 'skipped':
        return '-';
      default:
        return '?';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-800 mb-4 text-sm"
          >
            ← Voltar ao Histórico
          </button>

          <div className={`border rounded-lg p-6 ${getStatusColor(execution.status)}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  {execution.automation_name}
                </h1>
                <p className="text-neutral-600 text-sm font-mono mt-1">{execution.id}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${execution.status === 'success'
                    ? 'bg-success-200 text-success-800'
                    : 'bg-error-200 text-error-800'
                  }`}
              >
                {execution.status === 'success' ? '✓ Sucesso' : '✗ Falha'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-neutral-600">Início</p>
                <p className="font-medium">
                  {format(new Date(execution.started_at), 'dd MMM yyyy HH:mm:ss', {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <p className="text-neutral-600">Gatilho</p>
                <p className="font-medium capitalize">{execution.trigger_type}</p>
              </div>
              <div>
                <p className="text-neutral-600">Duração</p>
                <p className="font-medium">{execution.duration_ms}ms</p>
              </div>
              <div>
                <p className="text-neutral-600">Passos</p>
                <p className="font-medium">{steps.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Panel */}
        {execution.status === 'failed' && execution.error_context && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-error-900 mb-4">Detalhes do Erro</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-error-700 font-medium">Mensagem</p>
                <p className="mt-1 text-error-900 font-mono text-sm">
                  {execution.error_context.message}
                </p>
              </div>
              {execution.error_context.stack && (
                <div>
                  <p className="text-sm text-error-700 font-medium">Stack Trace</p>
                  <pre className="mt-1 bg-white border border-error-200 rounded p-3 text-xs text-error-800 overflow-auto max-h-32">
                    {execution.error_context.stack}
                  </pre>
                </div>
              )}
              {execution.error_context.state && (
                <div>
                  <p className="text-sm text-error-700 font-medium">Estado</p>
                  <pre className="mt-1 bg-white border border-error-200 rounded p-3 text-xs text-error-800 overflow-auto max-h-32">
                    {JSON.stringify(execution.error_context.state, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Steps Timeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">Timeline de Passos</h2>

          {steps.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-neutral-500">
              Nenhum passo registrado
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="bg-white border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step.status === 'success'
                            ? 'bg-success-100 text-success-700'
                            : step.status === 'failed'
                              ? 'bg-error-100 text-error-700'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                      >
                        {getStepStatusIcon(step.status)}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-neutral-900">Passo {index + 1}: {step.step_id}</p>
                        <p className="text-sm text-neutral-600">
                          {step.duration_ms}ms
                          {step.error_message && ` • ${step.error_message}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-neutral-400">{expandedStep === step.id ? '▼' : '▶'}</span>
                  </button>

                  {expandedStep === step.id && (
                    <div className="border-t px-6 py-4 bg-neutral-50 space-y-4">
                      {step.input && (
                        <div>
                          <p className="text-sm font-medium text-neutral-700 mb-2">Input</p>
                          <pre className="bg-white border rounded p-3 text-xs text-neutral-800 overflow-auto max-h-32">
                            {JSON.stringify(step.input, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.output && (
                        <div>
                          <p className="text-sm font-medium text-neutral-700 mb-2">Output</p>
                          <pre className="bg-white border rounded p-3 text-xs text-neutral-800 overflow-auto max-h-32">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
