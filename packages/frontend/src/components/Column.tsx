import React from 'react';

interface ColumnProps {
  id: string;
  name: string;
  color?: string;
  cardCount: number;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Column({
  id,
  name,
  color,
  cardCount,
  onDragOver,
  onDrop,
  children,
  footer,
}: ColumnProps) {
  return (
    <div
      data-column-id={id}
      className="flex min-h-[24rem] w-80 flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50 p-4"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color || '#9CA3AF' }}
            aria-hidden="true"
          />
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
        </div>
        <span className="rounded-full bg-gray-200 px-2 py-1 text-sm text-gray-700">
          {cardCount}
        </span>
      </div>
      <div className="flex-1 space-y-2">{children}</div>
      {footer}
    </div>
  );
}
