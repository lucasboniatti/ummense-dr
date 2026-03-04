import React from 'react';

interface ColumnProps {
  id: number;
  name: string;
  cardCount: number;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  children?: React.ReactNode;
}

export function Column({
  id,
  name,
  cardCount,
  onDragOver,
  onDrop,
  children,
}: ColumnProps) {
  return (
    <div
      className="flex-shrink-0 w-80 bg-neutral-100 rounded-lg p-4 border border-neutral-200"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-neutral-900">{name}</h3>
        <span className="bg-neutral-300 text-neutral-800 px-2 py-1 rounded text-sm font-medium">
          {cardCount}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
