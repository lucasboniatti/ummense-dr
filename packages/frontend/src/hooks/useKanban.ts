import { useState } from 'react';

export interface KanbanCard {
  id: number;
  title: string;
  columnId: number;
}

export interface KanbanColumn {
  id: number;
  name: string;
  cards: KanbanCard[];
}

export function useKanban(initialColumns: KanbanColumn[]) {
  const [columns, setColumns] = useState(initialColumns);
  const [draggedCard, setDraggedCard] = useState<{
    cardId: number;
    fromColumnId: number;
  } | null>(null);

  const moveCard = (cardId: number, fromColumnId: number, toColumnId: number) => {
    setColumns(prevColumns =>
      prevColumns.map(col => {
        if (col.id === fromColumnId) {
          return {
            ...col,
            cards: col.cards.filter(c => c.id !== cardId),
          };
        }
        if (col.id === toColumnId) {
          const card = prevColumns
            .find(c => c.id === fromColumnId)
            ?.cards.find(c => c.id === cardId);
          if (card) {
            return {
              ...col,
              cards: [...col.cards, { ...card, columnId: toColumnId }],
            };
          }
        }
        return col;
      })
    );
  };

  const addColumn = (name: string) => {
    const newColumn: KanbanColumn = {
      id: Math.max(...columns.map(c => c.id)) + 1,
      name,
      cards: [],
    };
    setColumns([...columns, newColumn]);
  };

  const deleteColumn = (columnId: number) => {
    setColumns(columns.filter(c => c.id !== columnId));
  };

  return {
    columns,
    draggedCard,
    setDraggedCard,
    moveCard,
    addColumn,
    deleteColumn,
  };
}
