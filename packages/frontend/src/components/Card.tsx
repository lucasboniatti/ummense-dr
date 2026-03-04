import React from 'react';

interface CardProps {
  id: number;
  title: string;
  description?: string;
  tags?: { id: number; name: string; color: string }[];
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function Card({
  id,
  title,
  description,
  tags,
  onClick,
  draggable = true,
  onDragStart,
}: CardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="p-4 bg-white rounded-lg shadow-md cursor-move hover:shadow-lg transition-shadow border border-neutral-200"
    >
      <h4 className="font-semibold mb-2 text-neutral-900">{title}</h4>
      {description && (
        <p className="text-sm text-neutral-600 mb-2">{description}</p>
      )}
      {tags && tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="inline-block px-2 py-1 text-xs rounded text-white font-medium"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
