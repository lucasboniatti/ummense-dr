import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FlowSidebar } from '../../components/FlowSidebar';
import { useFlows } from '../../hooks/useFlows';

export default function FlowsIndexPage() {
  const router = useRouter();
  const { flows, loading, error } = useFlows();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!router.isReady || loading || flows.length === 0) {
      return;
    }

    void router.replace(`/flows/${flows[0].id}?view=kanban`);
  }, [flows, loading, router]);

  if (loading || flows.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
          Carregando seus fluxos...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <div className="hidden w-80 flex-shrink-0 lg:block">
          <FlowSidebar currentView="kanban" />
        </div>

        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] lg:hidden">
              <FlowSidebar
                currentView="kanban"
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </>
        ) : null}

        <main className="flex flex-1 flex-col">
          <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 lg:hidden"
            >
              Fluxos
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-xl rounded-3xl border border-dashed border-gray-300 bg-white px-8 py-10 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                TaskFlow
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900">
                Crie seu primeiro fluxo
              </h1>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Quando voce tiver um fluxo, esta rota redireciona automaticamente
                para ele. Use o painel lateral para criar o primeiro quadro.
              </p>

              {error ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Falha ao carregar fluxos: {error}
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
