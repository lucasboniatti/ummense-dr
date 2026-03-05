import React from 'react';
import { FlowCardStatus } from '../services/flows.service';

export interface CardTag {
  id: number;
  name: string;
  color: string;
}

interface CardProps {
  id: number;
  title: string;
  description?: string | null;
  status: FlowCardStatus;
  responsible?: string | null;
  progressPercent?: number;
  tags?: CardTag[];
  updatedAt?: string;
  isPending?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

function statusChip(status: FlowCardStatus) {
  if (status === 'completed') {
    return {
      label: 'Concluído',
      className: 'bg-success-50 text-success-700 border-success-200',
    };
  }

  if (status === 'blocked') {
    return {
      label: 'Bloqueado',
      className: 'bg-error-50 text-error-700 border-error-200',
    };
  }

  return {
    label: 'Ativo',
    className: 'bg-primary-50 text-primary-700 border-primary-200',
  };
}

function formatRelativeDate(value: string | undefined): string {
  if (!value) {
    return 'Atualizado agora';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Atualização recente';
  }

  return `Atualizado em ${parsed.toLocaleDateString('pt-BR')}`;
}

export function Card({
  title,
  description,
  status,
  responsible,
  progressPercent = 0,
  tags,
  updatedAt,
  isPending = false,
  onClick,
  draggable = true,
  onDragStart,
  onDragEnd,
}: CardProps) {
  const chip = statusChip(status);
  const safeProgress = Math.min(100, Math.max(0, Math.round(progressPercent)));

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={[
        'rounded-lg border border-neutral-200 bg-white p-4 transition-shadow',
        draggable ? 'cursor-move hover:shadow-lg' : 'cursor-default',
        isPending ? 'opacity-70 ring-1 ring-primary-300' : 'shadow-sm',
      ].join(' ')}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-sm font-semibold text-neutral-900">{title}</h4>
        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${chip.className}`}>
          {chip.label}
        </span>
      </div>

      {description && <p className="mb-3 line-clamp-2 text-xs text-neutral-600">{description}</p>}

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-neutral-600">
          <span>Progresso</span>
          <span>{safeProgress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-1.5 rounded-full bg-primary-600 transition-all"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-neutral-600">
        <span className="font-semibold">Responsável</span>
        <span className="max-w-[60%] truncate text-right text-neutral-800">
          {responsible || 'Não definido'}
        </span>
      </div>

      {tags && tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="inline-block rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      <p className="text-[11px] text-neutral-500">{formatRelativeDate(updatedAt)}</p>
    </div>
  );
}
