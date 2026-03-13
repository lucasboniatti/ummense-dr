import React, { useEffect, useState } from 'react';
import { useCards } from '../hooks/useCards';
import type { CardWithSummary } from '../types/taskflow';
import { CardDetailModal } from './CardDetailModal';
import { Toast } from './Toast';

interface ListViewProps {
  flowId: string;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sortCards(cards: CardWithSummary[]) {
  return [...cards].sort((left, right) => {
    const columnNameCompare = (left.column_name || '').localeCompare(
      right.column_name || ''
    );

    if (columnNameCompare !== 0) {
      return columnNameCompare;
    }

    return left.title.localeCompare(right.title);
  });
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="hidden grid-cols-[2fr,1fr,1fr,1fr] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`list-view-skeleton-${index}`}
            className="grid gap-3 px-5 py-4 md:grid-cols-[2fr,1fr,1fr,1fr]"
          >
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListView({ flowId }: ListViewProps) {
  const { cards, loading, error, refetch } = useCards(flowId);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardTitle, setSelectedCardTitle] = useState<string | undefined>(
    undefined
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const sortedCards = sortCards(cards);

  useEffect(() => {
    if (!error) {
      return;
    }

    setToastMessage(error);
  }, [error]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  if (!flowId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Selecione um fluxo para carregar a lista.
      </div>
    );
  }

  if (loading && cards.length === 0) {
    return <ListSkeleton />;
  }

  if (error && cards.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Falha ao carregar os cards: {error}
      </div>
    );
  }

  if (!loading && sortedCards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Nenhum card neste fluxo ainda. Crie o primeiro card pelo Kanban.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[2fr,1fr,1fr,1fr] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
          <span>Card</span>
          <span>Coluna</span>
          <span>Tarefas</span>
          <span>Atualizado</span>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedCards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedCardId(card.id);
                setSelectedCardTitle(card.title);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedCardId(card.id);
                  setSelectedCardTitle(card.title);
                }
              }}
              className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-gray-50 md:grid-cols-[2fr,1fr,1fr,1fr]"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {card.title}
                </p>
                <p className="mt-1 text-xs text-gray-500 md:hidden">
                  {(card.column_name || 'Sem coluna')} ·{' '}
                  {card.task_summary.done}/{card.task_summary.total} tarefas
                </p>
              </div>

              <div className="hidden text-sm text-gray-600 md:block">
                {card.column_name || 'Sem coluna'}
              </div>

              <div className="hidden md:block">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {card.task_summary.done}/{card.task_summary.total} concluidas
                </span>
              </div>

              <div className="text-sm text-gray-500">
                {formatUpdatedAt(card.updated_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCardId ? (
        <CardDetailModal
          isOpen
          cardId={selectedCardId}
          cardTitle={selectedCardTitle}
          onClose={() => {
            setSelectedCardId(null);
            setSelectedCardTitle(undefined);
          }}
          onCardUpdated={() => {
            void refetch();
          }}
        />
      ) : null}

      {toastMessage ? (
        <Toast
          message={toastMessage}
          tone="error"
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}
    </>
  );
}
