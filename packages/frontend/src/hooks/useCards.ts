import { useEffect, useRef, useState } from 'react';
import {
  cardsApi,
  getTaskflowErrorMessage,
} from '../services/taskflow.api';
import type {
  Card,
  CardWithSummary,
  CreateCardDTO,
  MoveCardDTO,
  ReorderCardsDTO,
  UpdateCardDTO,
} from '../types/taskflow';

interface CreateCardInput extends Omit<CreateCardDTO, 'flow_id'> {
  flow_id?: string;
}

interface UseCardsResult {
  cards: CardWithSummary[];
  loading: boolean;
  error: string | null;
  createCard: (payload: CreateCardInput) => Promise<Card>;
  updateCard: (cardId: string, payload: UpdateCardDTO) => Promise<Card>;
  deleteCard: (cardId: string) => Promise<void>;
  moveCard: (
    cardId: string,
    columnId: string,
    orderIndex: number
  ) => Promise<void>;
  refetch: () => Promise<CardWithSummary[]>;
}

function sortByOrder(cards: CardWithSummary[]) {
  return [...cards].sort((left, right) => left.order_index - right.order_index);
}

function reindexCards(cards: CardWithSummary[]) {
  return sortByOrder(cards).map((card, index) => ({
    ...card,
    order_index: index,
  }));
}

function applyCardMove(
  cards: CardWithSummary[],
  cardId: string,
  targetColumnId: string,
  targetOrderIndex: number
) {
  const currentCard = cards.find((card) => card.id === cardId);

  if (!currentCard) {
    throw new Error('Card not found in local state');
  }

  const sameColumn = currentCard.column_id === targetColumnId;
  const sourceCards = sortByOrder(
    cards.filter(
      (card) => card.column_id === currentCard.column_id && card.id !== cardId
    )
  );
  const targetCards = sameColumn
    ? sourceCards
    : sortByOrder(cards.filter((card) => card.column_id === targetColumnId));
  const nextIndex = Math.max(0, Math.min(targetOrderIndex, targetCards.length));
  const targetColumnName =
    currentCard.column_id === targetColumnId
      ? currentCard.column_name
      : cards.find((card) => card.column_id === targetColumnId)?.column_name ||
        currentCard.column_name;
  const movedCard: CardWithSummary = {
    ...currentCard,
    column_id: targetColumnId,
    column_name: targetColumnName,
    order_index: nextIndex,
  };
  const nextTargetCards = [...targetCards];

  nextTargetCards.splice(nextIndex, 0, movedCard);

  const updates = new Map<string, CardWithSummary>();

  if (!sameColumn) {
    for (const card of reindexCards(sourceCards)) {
      updates.set(card.id, card);
    }
  }

  for (const card of reindexCards(nextTargetCards)) {
    updates.set(card.id, card);
  }

  return cards.map((card) => updates.get(card.id) || card);
}

function buildReorderPayload(
  cards: CardWithSummary[],
  affectedColumnIds: string[]
): ReorderCardsDTO {
  const affected = new Set(affectedColumnIds);
  const moves: MoveCardDTO[] = cards
    .filter((card) => affected.has(card.column_id))
    .sort((left, right) => {
      if (left.column_id === right.column_id) {
        return left.order_index - right.order_index;
      }

      return left.column_id.localeCompare(right.column_id);
    })
    .map((card) => ({
      card_id: card.id,
      column_id: card.column_id,
      order_index: card.order_index,
    }));

  return { moves };
}

export function useCards(flowId?: string | null): UseCardsResult {
  const [cards, setCards] = useState<CardWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchCards = async (withLoading: boolean = true) => {
    if (!flowId) {
      if (mountedRef.current) {
        setCards([]);
        setError(null);
        setLoading(false);
      }

      return [];
    }

    if (withLoading && mountedRef.current) {
      setLoading(true);
    }

    if (mountedRef.current) {
      setError(null);
    }

    try {
      const response = await cardsApi.list(flowId);

      if (mountedRef.current) {
        setCards(response.data);
      }

      return response.data;
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (withLoading && mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchCards().catch(() => undefined);
  }, [flowId]);

  const createCard = async (payload: CreateCardInput) => {
    const resolvedFlowId = payload.flow_id || flowId;

    if (!resolvedFlowId) {
      const localError = new Error('flowId is required to create a card');

      if (mountedRef.current) {
        setError(localError.message);
      }

      throw localError;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await cardsApi.create({
        ...payload,
        flow_id: resolvedFlowId,
      });
      await fetchCards(false);
      return response.data;
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const updateCard = async (cardId: string, payload: UpdateCardDTO) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await cardsApi.update(cardId, payload);
      await fetchCards(false);
      return response.data;
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const deleteCard = async (cardId: string) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      await cardsApi.delete(cardId);

      if (mountedRef.current) {
        setCards((currentCards) =>
          currentCards.filter((card) => card.id !== cardId)
        );
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const moveCard = async (
    cardId: string,
    columnId: string,
    orderIndex: number
  ) => {
    const currentCard = cards.find((card) => card.id === cardId);

    if (!currentCard) {
      const localError = new Error('Card not found in local state');

      if (mountedRef.current) {
        setError(localError.message);
      }

      throw localError;
    }

    const previousCards = cards;
    const nextCards = applyCardMove(previousCards, cardId, columnId, orderIndex);

    if (mountedRef.current) {
      setError(null);
      setCards(nextCards);
    }

    try {
      await cardsApi.reorder(
        buildReorderPayload(nextCards, [currentCard.column_id, columnId])
      );
      await fetchCards(false);
    } catch (requestError) {
      if (mountedRef.current) {
        setCards(previousCards);
        setError(getTaskflowErrorMessage(requestError));
      }

      throw requestError;
    }
  };

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    refetch: () => fetchCards(),
  };
}
