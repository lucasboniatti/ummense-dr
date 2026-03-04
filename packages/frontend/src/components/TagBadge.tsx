import React from 'react';
import { Badge } from './ui/Badge';

interface TagBadgeProps {
  name: string;
  color?: string;
  onRemove?: () => void;
}

export function TagBadge({ name, color = '#0284c7', onRemove }: TagBadgeProps) {
  return (
    <Badge style={{ backgroundColor: color }} className="text-white gap-2 cursor-pointer">
      {name}
      {onRemove && <button onClick={onRemove} className="ml-1">✕</button>}
    </Badge>
  );
}
