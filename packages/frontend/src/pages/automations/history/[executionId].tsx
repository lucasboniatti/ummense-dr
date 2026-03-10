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
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text-accent)] transition-colors hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          <div className="app-inline-banner app-inline-banner-error">
            <strong>Execucao</strong>
            <p>{error || 'Execução não encontrada.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'success':
        return {
          pillClass: 'app-status-pill-success',
          tileClass: 'bg-success-100 text-success-700',
          icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
          label: 'Sucesso',
        };
      case 'failed':
        return {
          pillClass: 'app-status-pill-error',
          tileClass: 'bg-error-100 text-error-700',
          icon: <CircleX className="h-4 w-4" aria-hidden="true" />,
          label: 'Falha',
        };
      case 'skipped':
        return {
          pillClass: 'app-status-pill-warning',
          tileClass: 'bg-warning-100 text-warning-700',
          icon: <Minus className="h-4 w-4" aria-hidden="true" />,
          label: 'Ignorado',
        };
      default:
        return {
          pillClass: 'app-status-pill-info',
          tileClass: 'bg-primary-100 text-primary-700',
          icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
          label: 'Em andamento',
        };
    }
  };

  const executionStatus = getStatusMeta(execution.status);

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-accent)] transition-colors hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao histórico
          </button>

          <div className="app-note-card space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="app-kicker">Execução</p>
                <h1 className="text-2xl font-bold tracking-[-0.03em] text-app-strong">
                  {execution.automation_name}
                </h1>
                <p className="mt-1 text-sm font-mono text-app-secondary">{execution.id}</p>
              </div>
              <span
                className={`app-status-pill ${executionStatus.pillClass}`}
              >
                {executionStatus.icon}
                {executionStatus.label}
              </span>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="app-surface-muted rounded-[20px] p-4">
                <p className="text-app-secondary">Início</p>
                <p className="mt-1 font-medium text-app-strong">
                  {format(new Date(execution.started_at), 'dd MMM yyyy HH:mm:ss', {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div className="app-surface-muted rounded-[20px] p-4">
                <p className="text-app-secondary">Gatilho</p>
                <p className="mt-1 font-medium capitalize text-app-strong">{execution.trigger_type}</p>
              </div>
              <div className="app-surface-muted rounded-[20px] p-4">
                <p className="text-app-secondary">Duração</p>
                <p className="mt-1 font-medium text-app-strong">
                  {execution.duration_ms ? `${execution.duration_ms}ms` : 'Em andamento'}
                </p>
              </div>
              <div className="app-surface-muted rounded-[20px] p-4">
                <p className="text-app-secondary">Passos</p>
                <p className="mt-1 font-medium text-app-strong">{steps.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {execution.status === 'failed' && execution.error_context && (
        <div className="app-inline-banner app-inline-banner-error space-y-4">
          <strong>Falha</strong>
          <h2 className="text-lg font-semibold">Detalhes do erro</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium opacity-80">Mensagem</p>
              <p className="mt-1 font-mono text-sm">
                {execution.error_context.message}
              </p>
            </div>
            {execution.error_context.stack && (
              <div>
                <p className="text-sm font-medium opacity-80">Stack trace</p>
                <pre className="app-code-block mt-1 max-h-32">
                  {execution.error_context.stack}
                </pre>
              </div>
            )}
            {execution.error_context.state && (
              <div>
                <p className="text-sm font-medium opacity-80">Estado</p>
                <pre className="app-code-block mt-1 max-h-32">
                  {JSON.stringify(execution.error_context.state, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-app-strong">Timeline de passos</h2>

        {steps.length === 0 ? (
          <div className="app-surface-muted rounded-[22px] p-6 text-center text-app-secondary">
            Nenhum passo registrado.
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="app-table-shell">
                <button
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  className="flex w-full items-center justify-between px-6 py-4 transition hover:bg-[color:var(--surface-emphasis)]"
                >
                  <div className="flex flex-1 items-center gap-4">
                    {(() => {
                      const stepStatus = getStatusMeta(step.status);

                      return (
                        <>
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${stepStatus.tileClass}`}
                          >
                            {stepStatus.icon}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-app-strong">
                              Passo {index + 1}: {step.step_id}
                            </p>
                            <p className="text-sm text-app-secondary">
                              {step.duration_ms ? `${step.duration_ms}ms` : 'Sem duracao registrada'}
                              {step.error_message && ` • ${step.error_message}`}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {expandedStep === step.id ? (
                    <ChevronDown className="h-4 w-4 text-app-muted" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-app-muted" aria-hidden="true" />
                  )}
                </button>

                {expandedStep === step.id && (
                  <div className="space-y-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-6 py-4">
                    {step.input && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-app-secondary">Input</p>
                        <pre className="app-code-block max-h-32">
                          {JSON.stringify(step.input, null, 2)}
                        </pre>
                      </div>
                    )}
                    {step.output && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-app-secondary">Output</p>
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
