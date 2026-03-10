import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleX, Clock3 } from 'lucide-react';

interface Execution {
  execution_id: string;
  rule_id: string;
  rule_name: string;
  webhook_id?: string;
  status: 'success' | 'failed' | 'pending';
  triggered_at: string;
  execution_time_ms: number;
  error_message?: string;
}

interface RecentExecutionsProps {
  executions: Execution[];
}

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'bg-success-100 text-success-800';
    case 'failed':
      return 'bg-error-100 text-error-800';
    case 'pending':
      return 'bg-warning-100 text-warning-800';
    default:
      return 'bg-neutral-100 text-neutral-800';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'success':
      return 'Sucesso';
    case 'failed':
      return 'Falha';
    case 'pending':
      return 'Pendente';
    default:
      return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
    case 'failed':
      return <CircleX className="h-4 w-4" aria-hidden="true" />;
    case 'pending':
      return <Clock3 className="h-4 w-4" aria-hidden="true" />;
    default:
      return null;
  }
};

export const RecentExecutions: React.FC<RecentExecutionsProps> = ({ executions }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Regra</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Duracao</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Horario</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((execution) => (
            <tr key={execution.execution_id} className="border-b border-neutral-200 hover:bg-neutral-50">
              <td className="px-4 py-3 text-sm font-medium text-neutral-900">{execution.rule_name}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(execution.status)}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {getStatusIcon(execution.status)}
                    {getStatusLabel(execution.status)}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">{execution.execution_time_ms}ms</td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {new Date(execution.triggered_at).toLocaleDateString('pt-BR')}{' '}
                {new Date(execution.triggered_at).toLocaleTimeString('pt-BR')}
              </td>
              <td className="px-4 py-3 text-sm">
                <Link
                  href={`/dashboard/automations/${execution.execution_id}`}
                  className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium"
                >
                  Ver
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
