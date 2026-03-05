import React from 'react';
import { Column } from './Column';
import { Card } from './Card';
import { KanbanCard, KanbanColumn } from '../hooks/useKanban';

interface KanbanBoardProps {
  columns: KanbanColumn[];
  isCardPending: (cardId: number) => boolean;
  onDragStart: (cardId: number, fromColumnId: number) => void;
  onDragEnd: () => void;
  onDropColumn: (toColumnId: number) => void;
  filterCard?: (card: KanbanCard, column: KanbanColumn) => boolean;
}

export function KanbanBoard({
  columns,
  isCardPending,
  onDragStart,
  onDragEnd,
  onDropColumn,
  filterCard,
}: KanbanBoardProps) {
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex min-h-[380px] gap-4">
        {columns.map((column) => {
          const filteredCards = filterCard
            ? column.cards.filter((card) => filterCard(card, column))
            : column.cards;

          return (
            <Column
              key={column.id}
              name={column.name}
              cardCount={filteredCards.length}
              totalCount={column.cards.length}
              onDragOver={handleDragOver}
              onDrop={() => onDropColumn(column.id)}
            >
              {filteredCards.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-300 bg-white/70 p-3 text-xs text-neutral-500">
                  Sem cards para este filtro.
                </div>
              ) : (
                filteredCards.map((card) => (
                  <Card
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    description={card.description}
                    status={card.status}
                    responsible={card.responsible}
                    progressPercent={card.progress?.percent ?? 0}
                    tags={card.tags}
                    updatedAt={card.updatedAt}
                    isPending={isCardPending(card.id)}
                    draggable={!isCardPending(card.id)}
                    onDragStart={() => onDragStart(card.id, column.id)}
                    onDragEnd={onDragEnd}
                  />
                ))
              )}
            </Column>
          );
        })}
      </div>
    </div>
  );
}
