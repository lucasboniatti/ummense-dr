import React from 'react';

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  removable?: boolean;
}

export function TagBadge({
  name,
  color,
  onRemove,
  removable = false,
}: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-white text-sm"
      style={{ backgroundColor: color }}
    >
      {name}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 font-bold hover:opacity-75"
          aria-label={`Remove ${name} tag`}
        >
          ×
        </button>
      )}
    </span>
  );
}
