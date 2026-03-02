import React from 'react';

interface DeliveryStatusBadgeProps {
  status: 'success' | 'failed' | 'pending' | 'dead_lettered' | 'processing';
  className?: string;
}

const statusConfig = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'Entregue',
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    label: 'Falhou',
  },
  pending: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: 'Aguardando',
  },
  dead_lettered: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    label: 'Descartado',
  },
  processing: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    label: 'Processando',
  },
};

export const DeliveryStatusBadge: React.FC<DeliveryStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className || ''}`}
    >
      {config.label}
    </span>
  );
};
