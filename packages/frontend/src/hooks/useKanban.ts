import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlowCardItem } from '../services/flows.service';

export interface KanbanCard extends FlowCardItem {
  columnId: number;
}

export interface KanbanColumn {
  id: number;
  name: string;
  order?: number;
  cards: KanbanCard[];
}

export interface DraggedCardPayload {
  cardId: number;
  fromColumnId: number;
}

interface MoveCardPayload extends DraggedCardPayload {
  toColumnId: number;
}

interface UseKanbanOptions {
  initialColumns: KanbanColumn[];
  onMoveCard?: (payload: MoveCardPayload) => Promise<void> | void;
}

function applyCardMove(columns: KanbanColumn[], payload: MoveCardPayload): KanbanColumn[] {
  const { cardId, fromColumnId, toColumnId } = payload;

  if (fromColumnId === toColumnId) {
    return columns;
  }

  const sourceColumn = columns.find((column) => column.id === fromColumnId);
  const movingCard = sourceColumn?.cards.find((card) => card.id === cardId);

  if (!movingCard) {
    return columns;
  }

  return columns.map((column) => {
    if (column.id === fromColumnId) {
      return {
        ...column,
        cards: column.cards.filter((card) => card.id !== cardId),
      };
    }

    if (column.id === toColumnId) {
      return {
        ...column,
        cards: [...column.cards, { ...movingCard, columnId: toColumnId }],
      };
    }

    return column;
  });
}

export function useKanban({ initialColumns, onMoveCard }: UseKanbanOptions) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [draggedCard, setDraggedCard] = useState<DraggedCardPayload | null>(null);
  const [pendingCards, setPendingCards] = useState<Set<number>>(new Set());
  const [lastMoveError, setLastMoveError] = useState<string | null>(null);
  const columnsRef = useRef<KanbanColumn[]>(initialColumns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    setColumns(initialColumns);
    columnsRef.current = initialColumns;
  }, [initialColumns]);

  const setCardPendingState = useCallback((cardId: number, pending: boolean) => {
    setPendingCards((previous) => {
      const next = new Set(previous);
      if (pending) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }
      return next;
    });
  }, []);

  const moveCard = useCallback(
    async (payload: MoveCardPayload): Promise<boolean> => {
      const { cardId } = payload;

      if (pendingCards.has(cardId)) {
        return false;
      }

      const snapshot = columnsRef.current;
      const nextState = applyCardMove(snapshot, payload);

      if (nextState === snapshot) {
        return false;
      }

      setLastMoveError(null);
      setCardPendingState(cardId, true);
      setColumns(nextState);
      columnsRef.current = nextState;

      try {
        if (onMoveCard) {
          await onMoveCard(payload);
        }

        return true;
      } catch (error) {
        setColumns(snapshot);
        columnsRef.current = snapshot;
        setLastMoveError(
          error instanceof Error
            ? error.message
            : 'Falha ao persistir movimentação do card.'
        );
        return false;
      } finally {
        setCardPendingState(cardId, false);
      }
    },
    [onMoveCard, pendingCards, setCardPendingState]
  );

  const dropOnColumn = useCallback(
    async (toColumnId: number): Promise<boolean> => {
      if (!draggedCard) {
        return false;
      }

      const payload: MoveCardPayload = {
        cardId: draggedCard.cardId,
        fromColumnId: draggedCard.fromColumnId,
        toColumnId,
      };

      setDraggedCard(null);
      return moveCard(payload);
    },
    [draggedCard, moveCard]
  );

  const startDrag = useCallback((payload: DraggedCardPayload) => {
    setDraggedCard(payload);
  }, []);

  const clearDrag = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const isCardPending = useCallback(
    (cardId: number) => pendingCards.has(cardId),
    [pendingCards]
  );

  const cardsCount = useMemo(
    () => columns.reduce((total, column) => total + column.cards.length, 0),
    [columns]
  );

  return {
    columns,
    draggedCard,
    cardsCount,
    lastMoveError,
    setColumns,
    setDraggedCard,
    startDrag,
    clearDrag,
    moveCard,
    dropOnColumn,
    isCardPending,
  };
}
