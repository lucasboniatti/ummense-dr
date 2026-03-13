import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useFlows } from '../hooks/useFlows';
import { getTaskflowErrorMessage } from '../services/taskflow.api';

type FlowView = 'kanban' | 'list';

interface FlowSidebarProps {
  activeFlowId?: string | null;
  currentView?: FlowView;
  onNavigate?: () => void;
}

export function FlowSidebar({
  activeFlowId,
  currentView = 'kanban',
  onNavigate,
}: FlowSidebarProps) {
  const router = useRouter();
  const { flows, loading, error, createFlow } = useFlows();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen) {
      setNameDraft('');
      setModalError(null);
      setSubmitting(false);
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen]);

  const handleCreateFlow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = nameDraft.trim();

    if (!name) {
      setModalError('Informe um nome para o fluxo');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const flow = await createFlow({ name });
      setIsModalOpen(false);
      onNavigate?.();
      await router.push(`/flows/${flow.id}?view=${currentView}`);
    } catch (requestError) {
      setModalError(getTaskflowErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <aside className="flex h-full flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                TaskFlow
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">
                Seus fluxos
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              Novo fluxo
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Navegue entre os quadros e crie novos fluxos sem sair da pagina.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {loading && flows.length === 0 ? (
            <div className="space-y-3 px-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`flow-sidebar-skeleton-${index}`}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : flows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Nenhum fluxo ainda. Use "Novo fluxo" para criar o primeiro.
            </div>
          ) : (
            <nav className="space-y-2" aria-label="Flow navigation">
              {flows.map((flow) => {
                const isActive = flow.id === activeFlowId;

                return (
                  <Link
                    key={flow.id}
                    href={`/flows/${flow.id}?view=${currentView}`}
                    onClick={() => onNavigate?.()}
                    className={`block rounded-xl border px-4 py-3 transition ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-900 shadow-sm'
                        : 'border-transparent bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {flow.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {flow.column_count} colunas · {flow.card_count} cards
                        </p>
                      </div>
                      {isActive ? (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                          ativo
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </nav>
          )}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Falha ao carregar os fluxos: {error}
            </div>
          ) : null}
        </div>
      </aside>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Novo fluxo
              </p>
              <h3 className="mt-1 text-xl font-semibold text-gray-900">
                Criar fluxo
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                O novo fluxo sera criado com as colunas padrao do TaskFlow.
              </p>
            </div>

            <form onSubmit={handleCreateFlow} className="space-y-4">
              <div>
                <label
                  htmlFor="new-flow-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Nome do fluxo
                </label>
                <input
                  id="new-flow-name"
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder="Ex.: Operacao comercial"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              {modalError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {modalError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  disabled={submitting}
                >
                  {submitting ? 'Criando...' : 'Criar fluxo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
