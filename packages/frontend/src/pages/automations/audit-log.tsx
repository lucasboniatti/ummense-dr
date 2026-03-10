import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { PageLoader, EmptyState } from '../../components/ui';

interface AuditLog {
  id: string;
  user_id: string;
  automation_id?: string;
  action: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const limit = 50;

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });

        const { data } = await apiClient.get(`/automations/audit-log?${params}`);
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [offset]);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create_automation: 'Criar Automação',
      modify_automation: 'Modificar Automação',
      delete_automation: 'Deletar Automação',
      enable_schedule: 'Habilitar Agendamento',
      disable_schedule: 'Desabilitar Agendamento',
      manual_retry: 'Retentativa Manual',
      update_retention_policy: 'Atualizar Política de Retenção',
      export_executions: 'Exportar Execuções',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.startsWith('create')) return 'bg-success-100 text-success-700';
    if (action.startsWith('delete')) return 'bg-error-100 text-error-700';
    if (action.startsWith('modify')) return 'bg-primary-100 text-primary-700';
    return 'bg-neutral-100 text-neutral-700';
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-heading">
          <p className="app-kicker">Compliance</p>
          <h1 className="app-page-title">Log de auditoria</h1>
          <p className="app-page-copy">Historico consolidado das acoes executadas pelos usuarios no sistema.</p>
        </div>

        {error && (
          <div className="app-inline-banner app-inline-banner-error">
            <strong>Auditoria</strong>
            {error}
          </div>
        )}
      </section>

      {loading && <PageLoader message="Carregando logs de auditoria..." />}

      {!loading && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="app-table-shell">
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="flex w-full items-center justify-between px-6 py-4 transition hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-neutral-900">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', {
                          locale: ptBR,
                        })}
                      </p>
                      {log.ip_address && (
                        <p className="text-xs text-neutral-500">{log.ip_address}</p>
                      )}
                    </div>
                  </div>
                  {expandedLog === log.id ? (
                    <ChevronDown className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  )}
                </button>

                {expandedLog === log.id && (
                  <div className="space-y-4 border-t border-[color:var(--border-subtle)] bg-neutral-50/85 px-6 py-4">
                    {log.old_values && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-2">Valores Anteriores</p>
                        <pre className="app-code-block max-h-32">
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_values && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-2">Novos Valores</p>
                        <pre className="app-code-block max-h-32">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.user_agent && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-1">User Agent</p>
                        <p className="text-xs text-neutral-600 break-all">{log.user_agent}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
      )}

      {!loading && logs.length === 0 && (
          <EmptyState
            icon={<ShieldAlert size={48} />}
            title="Nenhum log de auditoria encontrado"
            description="Ainda não existem registros de auditoria no sistema para o período selecionado."
            actionLabel="Recarregar"
            onAction={() => setOffset(0)}
          />
      )}

      {!loading && logs.length > 0 && (
          <div className="app-toolbar mt-2 flex items-center justify-between p-3">
            <div className="text-sm text-neutral-600">
              Mostrando {offset + 1} a {Math.min(offset + limit, total)} de {total} registros
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="app-control inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </button>
              <div className="text-sm text-neutral-600 flex items-center px-4">
                Página {currentPage} de {totalPages}
              </div>
              <button
                onClick={() => setOffset(Math.min(offset + limit, (totalPages - 1) * limit))}
                disabled={currentPage >= totalPages}
                className="app-control inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proxima
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
