import React from 'react';

interface ColumnProps {
  name: string;
  cardCount: number;
  totalCount?: number;
  hint?: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  children?: React.ReactNode;
}

export function Column({
  name,
  cardCount,
  totalCount,
  hint,
  onDragOver,
  onDrop,
  children,
}: ColumnProps) {
  const countLabel =
    typeof totalCount === 'number' && totalCount !== cardCount
      ? `${cardCount}/${totalCount}`
      : `${cardCount}`;

  return (
    <div
      className="flex w-80 flex-shrink-0 flex-col rounded-lg border border-neutral-200 bg-neutral-100 p-4"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-neutral-900">{name}</h3>
        <span className="rounded bg-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-800">
          {countLabel}
        </span>
      </div>

      {hint && <p className="mb-3 text-xs font-medium text-neutral-600">{hint}</p>}

      <div className="space-y-2 min-h-[40px]">{children}</div>
    </div>
  );
}
