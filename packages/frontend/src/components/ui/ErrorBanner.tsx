import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ErrorBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorBanner({
  title = 'Falha na operação',
  message,
  actionLabel,
  onAction,
  className,
  ...props
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        'app-inline-banner app-inline-banner-error gap-3 md:flex-row md:items-start md:justify-between',
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-error-100 p-2 text-error-600">
          <AlertCircle size={16} aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <strong>{title}</strong>
          <p className="m-0 text-sm">{message}</p>
        </div>
      </div>
      {actionLabel && onAction && (
        <Button type="button" variant="outline" size="sm" onClick={onAction} className="shrink-0">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
