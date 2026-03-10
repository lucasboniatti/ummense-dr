import React from 'react';
import { ToastMessage } from '../../contexts/ToastContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
    toast: ToastMessage;
    onClose: () => void;
}

const typeConfig = {
    success: {
        icon: <CheckCircle className="text-success-600 w-5 h-5 flex-shrink-0 mt-0.5" />,
        border: 'border-success-200',
    },
    error: {
        icon: <AlertCircle className="text-error-600 w-5 h-5 flex-shrink-0 mt-0.5" />,
        border: 'border-error-200',
    },
    info: {
        icon: <Info className="text-primary-600 w-5 h-5 flex-shrink-0 mt-0.5" />,
        border: 'border-primary-200',
    },
    warning: {
        icon: <AlertTriangle className="text-warning-600 w-5 h-5 flex-shrink-0 mt-0.5" />,
        border: 'border-warning-200',
    },
};

export function Toast({ toast, onClose }: ToastProps) {
    const config = typeConfig[toast.type];

    return (
        <div
            className={`${config.border} elevation-4 motion-slide-in-right w-full max-w-sm pointer-events-auto flex items-start gap-3 rounded-[20px] border bg-[color:var(--surface-raised)] p-4 text-[color:var(--text-strong)] transition-all duration-300`}
            role="alert"
        >
            {config.icon}

            <div className="flex-1 min-w-0 pr-2">
                <h4 className="break-words text-sm font-semibold leading-tight">
                    {toast.title}
                </h4>
                {toast.description && (
                    <p className="mt-1 break-words text-sm leading-snug text-[color:var(--text-secondary)]">
                        {toast.description}
                    </p>
                )}
            </div>

            <button
                onClick={onClose}
                className="app-control h-8 w-8 flex-shrink-0 rounded-full p-0 text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-strong)]"
                aria-label="Close"
            >
                <X size={16} />
            </button>
        </div>
    );
}
