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
  onCardClick?: (cardId: number) => void;
  filterCard?: (card: KanbanCard, column: KanbanColumn) => boolean;
}

export function KanbanBoard({
  columns,
  isCardPending,
  onDragStart,
  onDragEnd,
  onDropColumn,
  onCardClick,
  filterCard,
}: KanbanBoardProps) {
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const normalizeText = (value: string | null | undefined): string =>
    String(value || '').trim().toLowerCase();

  const resolveVisualStatus = (card: KanbanCard): 'active' | 'completed' | 'blocked' | 'inactive' => {
    const rawStatus = normalizeText(card.rawStatus);

    if (
      rawStatus === 'paused' ||
      rawStatus === 'pausado' ||
      rawStatus === 'canceled' ||
      rawStatus === 'cancelled' ||
      rawStatus === 'cancelado' ||
      rawStatus === 'inactive' ||
      rawStatus === 'inativo'
    ) {
      return 'inactive';
    }

    if (card.status === 'completed') {
      return 'completed';
    }

    if (card.status === 'blocked') {
      return 'blocked';
    }

    return 'active';
  };

  const fallbackToneFromName = (
    columnName: string
  ): 'active' | 'completed' | 'blocked' | 'inactive' | 'neutral' => {
    const normalizedName = normalizeText(columnName);

    if (
      normalizedName.includes('final') ||
      normalizedName.includes('conclu') ||
      normalizedName.includes('done')
    ) {
      return 'completed';
    }

    if (
      normalizedName.includes('paus') ||
      normalizedName.includes('cancel') ||
      normalizedName.includes('inativ')
    ) {
      return 'inactive';
    }

    if (normalizedName.includes('bloque')) {
      return 'blocked';
    }

    if (normalizedName) {
      return 'active';
    }

    return 'neutral';
  };

  const resolveColumnTone = (
    column: KanbanColumn,
    filteredCards: KanbanCard[]
  ): 'active' | 'completed' | 'blocked' | 'inactive' | 'neutral' => {
    const sourceCards = filteredCards.length > 0 ? filteredCards : column.cards;

    if (sourceCards.length === 0) {
      return fallbackToneFromName(column.name);
    }

    const counts = sourceCards.reduce<Record<'active' | 'completed' | 'blocked' | 'inactive', number>>(
      (acc, card) => {
        const visualStatus = resolveVisualStatus(card);
        acc[visualStatus] += 1;
        return acc;
      },
      {
        active: 0,
        completed: 0,
        blocked: 0,
        inactive: 0,
      }
    );

    return (Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] ||
      'neutral') as 'active' | 'completed' | 'blocked' | 'inactive' | 'neutral';
  };

  const resolveColumnStateLabel = (
    tone: 'active' | 'completed' | 'blocked' | 'inactive' | 'neutral'
  ): string => {
    if (tone === 'completed') return 'Concluído';
    if (tone === 'blocked') return 'Atenção';
    if (tone === 'inactive') return 'Pausado';
    if (tone === 'active') return 'Em operação';
    return 'Workspace';
  };

  return (
    <div className="app-surface overflow-hidden p-3 md:p-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-h-[420px] gap-4">
        {columns.map((column) => {
          const filteredCards = filterCard
            ? column.cards.filter((card) => filterCard(card, column))
            : column.cards;
          const tone = resolveColumnTone(column, filteredCards);
          const emptyMessage =
            column.cards.length === 0 ? 'Coluna vazia.' : 'Sem cards para este filtro.';

          return (
            <Column
              key={column.id}
              name={column.name}
              cardCount={filteredCards.length}
              totalCount={column.cards.length}
              tone={tone}
              stateLabel={resolveColumnStateLabel(tone)}
              hint={
                column.cards.length === filteredCards.length
                  ? 'Todos os cards visíveis nesta coluna.'
                  : `${filteredCards.length} de ${column.cards.length} cards visíveis com os filtros atuais.`
              }
              onDragOver={handleDragOver}
              onDrop={() => onDropColumn(column.id)}
            >
              {filteredCards.length === 0 ? (
                <div className="flex min-h-[108px] items-center justify-center rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-card)] px-4 py-5 text-center text-sm font-medium text-[color:var(--text-secondary)]">
                  {emptyMessage}
                </div>
              ) : (
                filteredCards.map((card) => (
                  <Card
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    description={card.description}
                    status={card.status}
                    rawStatus={card.rawStatus}
                    responsible={card.responsible}
                    progressPercent={card.progress?.percent ?? 0}
                    tasksSummary={card.tasksSummary}
                    tags={card.tags}
                    updatedAt={card.updatedAt}
                    isPending={isCardPending(card.id)}
                    draggable={!isCardPending(card.id)}
                    onClick={onCardClick ? () => onCardClick(card.id) : undefined}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      onDragStart(card.id, column.id);
                    }}
                    onDragEnd={onDragEnd}
                  />
                ))
              )}
            </Column>
          );
        })}
        </div>
      </div>
    </div>
  );
}
