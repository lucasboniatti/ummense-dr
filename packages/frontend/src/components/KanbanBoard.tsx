import React, { useEffect, useMemo, useState } from 'react';
import { useCards } from '../hooks/useCards';
import { flowsApi, getTaskflowErrorMessage } from '../services/taskflow.api';
import type {
  CardWithSummary,
  FlowColumnWithCards,
  FlowWithColumns,
} from '../types/taskflow';
import { Card } from './Card';
import { CardDetailModal } from './CardDetailModal';
import { Column } from './Column';
import { TaskSummaryBadge } from './TaskSummaryBadge';
import { Toast } from './Toast';

interface KanbanBoardProps {
  flowId: string;
  flow?: FlowWithColumns | null;
}

interface DragState {
  cardId: string;
  fromColumnId: string;
}

function flattenPrefetchedCards(flow: FlowWithColumns | null) {
  if (!flow) {
    return [];
  }

  return flow.columns.flatMap((column) => column.cards);
}

function truncateDescription(value: string | null, maxLength: number = 96) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function buildColumnsWithCards(
  columns: FlowColumnWithCards[],
  cards: CardWithSummary[]
) {
  const cardsByColumnId = cards.reduce<Record<string, CardWithSummary[]>>(
    (accumulator, card) => {
      if (!accumulator[card.column_id]) {
        accumulator[card.column_id] = [];
      }

      accumulator[card.column_id].push(card);
      return accumulator;
    },
    {}
  );

  return columns.map((column) => ({
    ...column,
    cards: (cardsByColumnId[column.id] || []).sort(
      (left, right) => left.order_index - right.order_index
    ),
  }));
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`kanban-skeleton-${index}`}
          className="w-80 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-10 animate-pulse rounded-full bg-gray-200" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <div
                key={`kanban-skeleton-card-${index}-${cardIndex}`}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanBoard({ flowId, flow: providedFlow }: KanbanBoardProps) {
  const [loadedFlow, setLoadedFlow] = useState<FlowWithColumns | null>(null);
  const [flowLoading, setFlowLoading] = useState(providedFlow === undefined);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<DragState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardWithSummary | null>(null);
  const [draftColumnId, setDraftColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const {
    cards,
    loading: cardsLoading,
    error: cardsError,
    createCard,
    moveCard,
    refetch: refetchCards,
  } = useCards(flowId);

  useEffect(() => {
    setSelectedCard(null);
    setDraftColumnId(null);
    setNewCardTitle('');
  }, [flowId]);

  useEffect(() => {
    if (providedFlow !== undefined) {
      setLoadedFlow(null);
      setFlowError(null);
      setFlowLoading(false);
      return;
    }

    let active = true;

    async function loadFlow() {
      setLoadedFlow(null);
      setFlowLoading(true);
      setFlowError(null);

      try {
        const response = await flowsApi.get(flowId);

        if (active) {
          setLoadedFlow(response.data);
        }
      } catch (error) {
        if (active) {
          setFlowError(getTaskflowErrorMessage(error));
        }
      } finally {
        if (active) {
          setFlowLoading(false);
        }
      }
    }

    void loadFlow();

    return () => {
      active = false;
    };
  }, [flowId, providedFlow]);

  useEffect(() => {
    if (!cardsError) {
      return;
    }

    setToastMessage(cardsError);
  }, [cardsError]);

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

  const resolvedFlow = providedFlow ?? loadedFlow;
  const prefetchedCards = useMemo(
    () => flattenPrefetchedCards(resolvedFlow),
    [resolvedFlow]
  );
  const resolvedCards = useMemo(() => {
    if (cards.length > 0) {
      return cards;
    }

    if (cardsLoading) {
      return prefetchedCards;
    }

    if (cardsError && prefetchedCards.length > 0) {
      return prefetchedCards;
    }

    return cards;
  }, [cards, cardsError, cardsLoading, prefetchedCards]);
  const columns = useMemo(
    () => buildColumnsWithCards(resolvedFlow?.columns || [], resolvedCards),
    [resolvedFlow, resolvedCards]
  );
  const totalCards = resolvedCards.length;
  const isInitialLoading =
    flowLoading || (cardsLoading && prefetchedCards.length === 0);

  const handleDragStart = (cardId: string, columnId: string) => {
    setDraggedCard({ cardId, fromColumnId: columnId });
  };

  const handleDrop = async (targetColumnId: string) => {
    if (!draggedCard) {
      return;
    }

    const targetCards = resolvedCards.filter(
      (card) =>
        card.column_id === targetColumnId && card.id !== draggedCard.cardId
    );

    setDraggedCard(null);

    try {
      await moveCard(draggedCard.cardId, targetColumnId, targetCards.length);
    } catch (error) {
      setToastMessage(getTaskflowErrorMessage(error));
    }
  };

  const handleCreateCard = async (columnId: string) => {
    const title = newCardTitle.trim();

    if (!title) {
      setToastMessage('Informe um titulo para criar o card');
      return;
    }

    try {
      await createCard({
        column_id: columnId,
        title,
      });
      setNewCardTitle('');
      setDraftColumnId(null);
    } catch (error) {
      setToastMessage(getTaskflowErrorMessage(error));
    }
  };

  if (!flowId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Selecione um fluxo para carregar o quadro Kanban.
      </div>
    );
  }

  if (isInitialLoading) {
    return <KanbanSkeleton />;
  }

  if (flowError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Falha ao carregar o fluxo: {flowError}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {columns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            Este fluxo ainda nao possui colunas.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
              <Column
                key={column.id}
                id={column.id}
                name={column.name}
                color={column.color}
                cardCount={column.cards.length}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void handleDrop(column.id)}
                footer={
                  draftColumnId === column.id ? (
                    <form
                      className="mt-4 space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleCreateCard(column.id);
                      }}
                    >
                      <input
                        type="text"
                        value={newCardTitle}
                        onChange={(event) => setNewCardTitle(event.target.value)}
                        placeholder="Titulo do card"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Criar card
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftColumnId(null);
                            setNewCardTitle('');
                          }}
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftColumnId(column.id);
                        setNewCardTitle('');
                      }}
                      className="mt-4 w-full rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-700"
                    >
                      Add Card
                    </button>
                  )
                }
              >
                {column.cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white/70 px-3 py-6 text-center text-sm text-gray-500">
                    No cards yet
                  </div>
                ) : (
                  column.cards.map((card) => (
                    <Card
                      key={card.id}
                      id={card.id}
                      title={card.title}
                      description={truncateDescription(card.description)}
                      draggable
                      onClick={() => setSelectedCard(card)}
                      onDragStart={() => handleDragStart(card.id, column.id)}
                      footer={
                        <TaskSummaryBadge summary={card.task_summary} />
                      }
                    />
                  ))
                )}
              </Column>
            ))}
          </div>
        )}

        {totalCards === 0 && columns.length > 0 && (
          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-900">
            Create your first card escolhendo uma coluna abaixo.
          </div>
        )}
      </div>

      <CardDetailModal
        isOpen={selectedCard !== null}
        cardId={selectedCard?.id || ''}
        cardTitle={selectedCard?.title}
        onClose={() => setSelectedCard(null)}
        onCardUpdated={() => {
          void refetchCards();
        }}
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </>
  );
}
