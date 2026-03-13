import React from 'react';

type FlowView = 'kanban' | 'list';

interface FlowHeaderProps {
  flowName: string;
  flowDescription?: string | null;
  view: FlowView;
  onViewChange: (view: FlowView) => void;
  onToggleSidebar?: () => void;
}

export function FlowHeader({
  flowName,
  flowDescription,
  view,
  onViewChange,
  onToggleSidebar,
}: FlowHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          {onToggleSidebar ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 lg:hidden"
            >
              Fluxos
            </button>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              TaskFlow
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              {flowName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              {flowDescription?.trim() || 'Sem descricao para este fluxo.'}
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => onViewChange('kanban')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-pressed={view === 'kanban'}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-pressed={view === 'list'}
          >
            Lista
          </button>
        </div>
      </div>
    </header>
  );
}
