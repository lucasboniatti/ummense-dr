import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, ShieldAlert, Sparkles } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { Badge, Button, EmptyState, PageLoader } from '../../components/ui';

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
  const createCount = logs.filter((log) => log.action.startsWith('create')).length;
  const modifyCount = logs.filter((log) => log.action.startsWith('modify')).length;
  const deleteCount = logs.filter((log) => log.action.startsWith('delete')).length;

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

  const getActionTone = (action: string) => {
    if (action.startsWith('create')) return 'success';
    if (action.startsWith('delete')) return 'error';
    if (action.startsWith('modify')) return 'info';
    return 'neutral';
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-hero-grid gap-4">
          <div className="app-page-heading">
            <p className="app-kicker">Compliance</p>
            <h1 className="app-page-title">Log de auditoria</h1>
            <p className="app-page-copy">Histórico consolidado das ações executadas pelos usuários no sistema.</p>
          </div>

          {error && (
            <div className="app-inline-banner app-inline-banner-error">
              <strong>Auditoria</strong>
              {error}
            </div>
          )}

          <div className="app-metric-strip">
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Janela atual</p>
                <Badge tone="neutral">página {currentPage}</Badge>
              </div>
              <p className="app-metric-value">{logs.length}</p>
              <p className="app-metric-copy">registros carregados nesta página</p>
            </div>
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Criações</p>
                <Badge tone="success">create</Badge>
              </div>
              <p className="app-metric-value">{createCount}</p>
              <p className="app-metric-copy">novas ações registradas</p>
            </div>
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Alterações</p>
                <Badge tone="info">modify</Badge>
              </div>
              <p className="app-metric-value">{modifyCount}</p>
              <p className="app-metric-copy">mudanças de configuração e operação</p>
            </div>
            <div className="app-metric-tile">
              <div className="flex items-center justify-between gap-3">
                <p className="app-metric-label">Remoções</p>
                <Badge tone={deleteCount > 0 ? 'warning' : 'neutral'}>delete</Badge>
              </div>
              <p className="app-metric-value">{deleteCount}</p>
              <p className="app-metric-copy">eventos sensíveis na janela atual</p>
            </div>
          </div>
        </div>
      </section>

      {loading && <PageLoader message="Carregando logs de auditoria..." />}

      {!loading && logs.length > 0 && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="app-table-shell">
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="flex w-full items-center justify-between px-6 py-4 transition hover:bg-[color:var(--surface-emphasis)]/60"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={getActionTone(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                        {log.automation_id && <Badge tone="neutral">{log.automation_id}</Badge>}
                        <Badge tone="neutral">{log.user_id}</Badge>
                      </div>
                      <p className="mt-2 font-medium text-[color:var(--text-strong)]">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', {
                          locale: ptBR,
                        })}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[color:var(--text-muted)]">
                        {log.ip_address && <span>{log.ip_address}</span>}
                        {log.user_agent && <span className="hidden lg:inline">{log.user_agent.slice(0, 42)}...</span>}
                      </div>
                    </div>
                  </div>
                  {expandedLog === log.id ? (
                    <ChevronDown className="h-4 w-4 text-[color:var(--text-muted)]" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[color:var(--text-muted)]" aria-hidden="true" />
                  )}
                </button>

                {expandedLog === log.id && (
                  <div className="space-y-4 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]/85 px-6 py-4">
                    {log.old_values && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-[color:var(--text-secondary)]">Valores anteriores</p>
                        <pre className="app-code-block max-h-32">
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_values && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-[color:var(--text-secondary)]">Novos valores</p>
                        <pre className="app-code-block max-h-32">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.user_agent && (
                      <div>
                        <p className="mb-1 text-sm font-medium text-[color:var(--text-secondary)]">User agent</p>
                        <p className="break-all text-xs text-[color:var(--text-secondary)]">{log.user_agent}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            </div>

            <div className="space-y-3">
              <div className="app-note-card flex gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                <div>
                  <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Leitura rápida</h3>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Expanda os registros mais críticos para entender quem mudou o quê, quando e com qual contexto técnico.
                  </p>
                </div>
              </div>
              <div className="app-note-card flex gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                <div>
                  <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Sinal da página</h3>
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    {deleteCount > 0
                      ? `${deleteCount} remoções apareceram nesta janela. Vale priorizar revisão desses eventos antes de encerrar a análise.`
                      : 'Sem remoções na janela atual. A maior parte do movimento está em criação e alteração de rotinas.'}
                  </p>
                </div>
              </div>
            </div>
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
            <div className="text-sm text-[color:var(--text-secondary)]">
              Mostrando {offset + 1} a {Math.min(offset + limit, total)} de {total} registros
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <div className="flex items-center px-4 text-sm text-[color:var(--text-secondary)]">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                onClick={() => setOffset(Math.min(offset + limit, (totalPages - 1) * limit))}
                disabled={currentPage >= totalPages}
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
              >
                Próxima
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
      )}
    </div>
  );
}
