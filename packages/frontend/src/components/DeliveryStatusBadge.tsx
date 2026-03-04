import React from 'react';
import { Badge } from './ui/Badge';

interface DeliveryStatusBadgeProps {
  status: 'success' | 'failed' | 'pending' | 'cancelled';
}

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const variant = {
    success: 'success',
    failed: 'destructive',
    pending: 'default',
    cancelled: 'outline',
  }[status] as any;

  const label = {
    success: '✓ Delivered',
    failed: '✗ Failed',
    pending: '⏳ Pending',
    cancelled: '⊘ Cancelled',
  }[status];

  return <Badge variant={variant}>{label}</Badge>;
}
