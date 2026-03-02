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
      className="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">{name}</h3>
        <span className="bg-gray-300 px-2 py-1 rounded text-sm">
          {cardCount}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
