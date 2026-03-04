import React, { useState } from 'react';

interface Card {
  id: number;
  title: string;
  columnId: number;
}

interface Column {
  id: number;
  name: string;
  cards: Card[];
}

export function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([
    { id: 1, name: 'Backlog', cards: [] },
    { id: 2, name: 'A Fazer', cards: [] },
    { id: 3, name: 'Em Progresso', cards: [] },
    { id: 4, name: 'Finalizado', cards: [] },
  ]);
  const [draggedCard, setDraggedCard] = useState<{
    cardId: number;
    fromColumnId: number;
  } | null>(null);

  const handleDragStart = (cardId: number, columnId: number) => {
    setDraggedCard({ cardId, fromColumnId: columnId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (toColumnId: number) => {
    if (!draggedCard) return;

    setColumns(
      columns.map(col => {
        if (col.id === draggedCard.fromColumnId) {
          return {
            ...col,
            cards: col.cards.filter(c => c.id !== draggedCard.cardId),
          };
        }
        if (col.id === toColumnId) {
          const card = columns
            .find(c => c.id === draggedCard.fromColumnId)
            ?.cards.find(c => c.id === draggedCard.cardId);
          if (card) {
            return { ...col, cards: [...col.cards, { ...card, columnId: toColumnId }] };
          }
        }
        return col;
      })
    );

    setDraggedCard(null);
  };

  return (
    <div className="flex gap-4 p-4 bg-white overflow-x-auto">
      {columns.map(column => (
        <div
          key={column.id}
          className="flex-shrink-0 w-80 bg-neutral-100 rounded-lg p-4 border border-neutral-200"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.id)}
        >
          <h3 className="text-lg font-bold mb-4 text-neutral-900">{column.name}</h3>
          <div className="space-y-2">
            {column.cards.map(card => (
              <div
                key={card.id}
                draggable
                onDragStart={() => handleDragStart(card.id, column.id)}
                className="p-3 bg-white rounded shadow cursor-move hover:shadow-md"
              >
                {card.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
