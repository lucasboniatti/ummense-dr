import React from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleX,
  Clock3,
  Skull,
} from 'lucide-react';
import { Badge } from './ui/Badge';

interface DeliveryStatusBadgeProps {
  status: 'success' | 'failed' | 'pending' | 'cancelled' | 'dead_lettered';
}

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const tone = {
    success: 'success',
    failed: 'error',
    pending: 'info',
    cancelled: 'neutral',
    dead_lettered: 'error',
  }[status] as 'success' | 'error' | 'info' | 'neutral';

  const content = {
    success: {
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
      label: 'Entregue',
    },
    failed: {
      icon: <CircleX className="h-4 w-4" aria-hidden="true" />,
      label: 'Falha',
    },
    pending: {
      icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
      label: 'Pendente',
    },
    cancelled: {
      icon: <Ban className="h-4 w-4" aria-hidden="true" />,
      label: 'Cancelado',
    },
    dead_lettered: {
      icon: <Skull className="h-4 w-4" aria-hidden="true" />,
      label: 'Em DLQ',
    },
  }[status];

  return (
    <Badge tone={tone}>
      <span className="inline-flex items-center gap-1.5">
        {content?.icon ?? <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
        {content?.label ?? status}
      </span>
    </Badge>
  );
}
