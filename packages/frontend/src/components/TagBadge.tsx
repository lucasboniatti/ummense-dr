import React from 'react';
import { Badge } from './ui/Badge';

interface TagBadgeProps {
  name: string;
  color?: string;
  onRemove?: () => void;
}

function mapTagToTone(name: string) {
  const normalized = name.trim().toLowerCase();

  if (normalized.includes('ativo')) return 'success';
  if (normalized.includes('pend')) return 'warning';
  if (normalized.includes('cancel')) return 'error';
  if (normalized.includes('revis')) return 'info';
  return 'neutral';
}

export function TagBadge({ name, color, onRemove }: TagBadgeProps) {
  const tone = mapTagToTone(name);
  const hasCustomColor = Boolean(color && tone === 'neutral');

  return (
    <Badge
      tone={hasCustomColor ? undefined : tone}
      style={hasCustomColor ? { backgroundColor: color, color: '#fff', borderColor: color } : undefined}
      className="cursor-pointer gap-2 transition-opacity hover:opacity-90"
    >
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 font-semibold hover:opacity-70"
          aria-label={`Remove ${name} tag`}
        >
          ✕
        </button>
      )}
    </Badge>
  );
}
