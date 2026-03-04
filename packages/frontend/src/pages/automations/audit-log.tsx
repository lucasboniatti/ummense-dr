import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

        const response = await fetch(`/api/automations/audit-log?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch audit logs');
        }

        const data = await response.json();
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
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Log de Auditoria</h1>
          <p className="text-neutral-600 mt-2">Histórico de todas as ações de usuário</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6">
            <p className="text-error-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-neutral-600 mt-4">Carregando logs...</p>
          </div>
        )}

        {/* Logs List */}
        {!loading && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition"
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
                  <span className="text-neutral-400">{expandedLog === log.id ? '▼' : '▶'}</span>
                </button>

                {expandedLog === log.id && (
                  <div className="border-t px-6 py-4 bg-neutral-50 space-y-4">
                    {log.old_values && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-2">Valores Anteriores</p>
                        <pre className="bg-white border rounded p-3 text-xs text-neutral-800 overflow-auto max-h-32">
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_values && (
                      <div>
                        <p className="text-sm font-medium text-neutral-700 mb-2">Novos Valores</p>
                        <pre className="bg-white border rounded p-3 text-xs text-neutral-800 overflow-auto max-h-32">
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

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-neutral-500">Nenhum log de auditoria encontrado</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-neutral-600">
              Mostrando {offset + 1} a {Math.min(offset + limit, total)} de {total} registros
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                ← Anterior
              </button>
              <div className="text-sm text-neutral-600 flex items-center px-4">
                Página {currentPage} de {totalPages}
              </div>
              <button
                onClick={() => setOffset(Math.min(offset + limit, (totalPages - 1) * limit))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
