import React from 'react';

interface CardProps {
  id: string;
  title: string;
  description?: string;
  tags?: { id: number; name: string; color: string }[];
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  footer?: React.ReactNode;
}

export function Card({
  id,
  title,
  description,
  tags,
  onClick,
  draggable = true,
  onDragStart,
  footer,
}: CardProps) {
  return (
    <div
      data-card-id={id}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <h4 className="mb-2 font-semibold text-gray-900">{title}</h4>
      {description && <p className="mb-3 text-sm text-gray-600">{description}</p>}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="inline-block px-2 py-1 text-xs rounded text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
