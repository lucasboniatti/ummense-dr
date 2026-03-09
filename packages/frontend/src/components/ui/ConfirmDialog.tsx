import * as React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

const variantConfig: Record<ConfirmVariant, { icon: React.ReactNode; confirmVariant: 'destructive' | 'primary' }> = {
  danger: {
    icon: <Trash2 className="h-6 w-6 text-error-600" />,
    confirmVariant: 'destructive',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-warning-600" />,
    confirmVariant: 'primary',
  },
  info: {
    icon: <Info className="h-6 w-6 text-primary-600" />,
    confirmVariant: 'primary',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const titleId = React.useId();
  const descriptionId = React.useId();

  // Focus trap and ESC handler
  React.useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange, loading]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Focus the confirm button when opened
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        confirmRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm"
      onClick={() => !loading && onOpenChange(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'app-surface mx-4 w-full max-w-md overflow-hidden rounded-[26px]',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
              {config.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-semibold tracking-[-0.02em] text-neutral-900">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-neutral-600">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[color:var(--border-subtle)] p-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Imperative API hook for easier usage
interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    options: ConfirmOptions;
    resolver: ((value: boolean) => void) | null;
    loading: boolean;
  }>({
    open: false,
    options: { title: '' },
    resolver: null,
    loading: false,
  });

  const confirm = React.useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolver: resolve, loading: false });
    });
  }, []);

  const handleConfirm = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    state.resolver?.(true);
  }, [state.resolver]);

  const handleCancel = React.useCallback(() => {
    state.resolver?.(false);
    setState((prev) => ({ ...prev, open: false }));
  }, [state.resolver]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title={state.options.title}
      description={state.options.description}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      loading={state.loading}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, dialog };
}