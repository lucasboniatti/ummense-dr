import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleX,
  Clock3,
  Minus,
} from 'lucide-react';
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
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
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
      <div className="app-page">
        <div className="px-4 py-4">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          <div className="app-inline-banner app-inline-banner-error">
            <strong>Execucao</strong>
            {error || 'Execução não encontrada'}
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
        return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
      case 'failed':
        return <CircleX className="h-4 w-4" aria-hidden="true" />;
      case 'skipped':
        return <Minus className="h-4 w-4" aria-hidden="true" />;
      default:
        return <Clock3 className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const executionStatus = (() => {
    switch (execution.status) {
      case 'success':
        return {
          className: 'bg-success-200 text-success-800',
          icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
          label: 'Sucesso',
        };
      case 'failed':
        return {
          className: 'bg-error-200 text-error-800',
          icon: <CircleX className="h-4 w-4" aria-hidden="true" />,
          label: 'Falha',
        };
      default:
        return {
          className: 'bg-neutral-200 text-neutral-800',
          icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
          label: 'Em andamento',
        };
    }
  })();

  return (
    <div className="app-page">
      <section className={`app-page-hero animate-fade-up ${getStatusColor(execution.status)}`}>
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao historico
          </button>

          <div className="rounded-[22px] border border-white/60 bg-white/65 p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="app-kicker">Execucao</p>
                <h1 className="text-2xl font-bold tracking-[-0.03em] text-neutral-900">
                  {execution.automation_name}
                </h1>
                <p className="mt-1 text-sm font-mono text-neutral-600">{execution.id}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${executionStatus.className}`}
              >
                {executionStatus.icon}
                {executionStatus.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
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
      </section>

      {execution.status === 'failed' && execution.error_context && (
        <div className="app-inline-banner app-inline-banner-error">
          <strong>Falha</strong>
          <h2 className="text-lg font-semibold text-error-900">Detalhes do erro</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-error-700">Mensagem</p>
              <p className="mt-1 font-mono text-sm text-error-900">
                {execution.error_context.message}
              </p>
            </div>
            {execution.error_context.stack && (
              <div>
                <p className="text-sm font-medium text-error-700">Stack trace</p>
                <pre className="app-code-block mt-1 max-h-32 text-error-800">
                  {execution.error_context.stack}
                </pre>
              </div>
            )}
            {execution.error_context.state && (
              <div>
                <p className="text-sm font-medium text-error-700">Estado</p>
                <pre className="app-code-block mt-1 max-h-32 text-error-800">
                  {JSON.stringify(execution.error_context.state, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Timeline de passos</h2>

        {steps.length === 0 ? (
          <div className="app-surface-muted rounded-[22px] p-6 text-center text-neutral-500">
            Nenhum passo registrado
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="app-table-shell">
                <button
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  className="flex w-full items-center justify-between px-6 py-4 transition hover:bg-neutral-50"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step.status === 'success'
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
                  {expandedStep === step.id ? (
                    <ChevronDown className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  )}
                </button>

                {expandedStep === step.id && (
                  <div className="space-y-4 border-t border-[color:var(--border-subtle)] bg-neutral-50/85 px-6 py-4">
                    {step.input && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-neutral-700">Input</p>
                        <pre className="app-code-block max-h-32">
                          {JSON.stringify(step.input, null, 2)}
                        </pre>
                      </div>
                    )}
                    {step.output && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-neutral-700">Output</p>
                        <pre className="app-code-block max-h-32">
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
  );
}
