import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FlowHeader } from '../../components/FlowHeader';
import { FlowSidebar } from '../../components/FlowSidebar';
import { KanbanBoard } from '../../components/KanbanBoard';
import { ListView } from '../../components/ListView';
import { flowsApi, getTaskflowErrorMessage } from '../../services/taskflow.api';
import type { FlowWithColumns } from '../../types/taskflow';

type FlowView = 'kanban' | 'list';

function resolveFlowId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function resolveView(value: string | string[] | undefined): FlowView {
  return value === 'list' ? 'list' : 'kanban';
}

export default function FlowPage() {
  const router = useRouter();
  const flowId = resolveFlowId(router.query.flowId);
  const view = resolveView(router.query.view);
  const [flow, setFlow] = useState<FlowWithColumns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!router.isReady || !flowId) {
      return;
    }

    if (router.query.view !== 'kanban' && router.query.view !== 'list') {
      void router.replace(`/flows/${flowId}?view=kanban`, undefined, {
        shallow: true,
      });
    }
  }, [flowId, router, router.isReady, router.query.view]);

  useEffect(() => {
    if (!router.isReady || !flowId) {
      return;
    }

    let active = true;

    async function loadFlow() {
      setFlow(null);
      setLoading(true);
      setError(null);

      try {
        const response = await flowsApi.get(flowId);

        if (active) {
          setFlow(response.data);
        }
      } catch (requestError) {
        if (active) {
          setFlow(null);
          setError(getTaskflowErrorMessage(requestError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFlow();

    return () => {
      active = false;
    };
  }, [flowId, router.isReady]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [flowId]);

  const handleViewChange = (nextView: FlowView) => {
    if (!flowId || nextView === view) {
      return;
    }

    void router.replace(`/flows/${flowId}?view=${nextView}`, undefined, {
      shallow: true,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <div className="hidden w-80 flex-shrink-0 lg:block">
          <FlowSidebar activeFlowId={flowId} currentView={view} />
        </div>

        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] lg:hidden">
              <FlowSidebar
                activeFlowId={flowId}
                currentView={view}
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          {flow ? (
            <FlowHeader
              flowName={flow.name}
              flowDescription={flow.description}
              view={view}
              onViewChange={handleViewChange}
              onToggleSidebar={() => setSidebarOpen(true)}
            />
          ) : (
            <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 lg:hidden"
              >
                Fluxos
              </button>
            </div>
          )}

          <div className="flex-1 p-4 sm:p-6">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                Carregando fluxo...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-sm">
                Falha ao carregar o fluxo: {error}
              </div>
            ) : !flow ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                Fluxo nao encontrado.
              </div>
            ) : view === 'list' ? (
              <ListView flowId={flowId} />
            ) : (
              <KanbanBoard flowId={flowId} flow={flow} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
