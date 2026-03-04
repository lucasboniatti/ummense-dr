import React from 'react';
import { Badge } from './ui/Badge';

interface DeliveryStatusBadgeProps {
  status: 'success' | 'failed' | 'pending' | 'cancelled' | 'dead_lettered';
}

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const variant = {
    success: 'success',
    failed: 'destructive',
    pending: 'default',
    cancelled: 'outline',
    dead_lettered: 'destructive',
  }[status] as any;

  const label = {
    success: '✓ Delivered',
    failed: '✗ Failed',
    pending: '⏳ Pending',
    cancelled: '⊘ Cancelled',
    dead_lettered: '☠ Dead Lettered',
  }[status];

  return <Badge variant={variant}>{label}</Badge>;
}
