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
        bg: 'bg-white',
        border: 'border-success-200',
        text: 'text-neutral-900',
    },
    error: {
        icon: <AlertCircle className="text-error-600 w-5 h-5 flex-shrink-0 mt-0.5" />,
        bg: 'bg-white',
        border: 'border-error-200',
        text: 'text-neutral-900',
    },
    info: {
        icon: <Info className="text-primary-600 w-5 h-5 flex-shrink-0 mt-0.5" />,
        bg: 'bg-white',
        border: 'border-primary-200',
        text: 'text-neutral-900',
    },
    warning: {
        icon: <AlertTriangle className="text-warning-600 w-5 h-5 flex-shrink-0 mt-0.5" />,
        bg: 'bg-white',
        border: 'border-warning-200',
        text: 'text-neutral-900',
    },
};

export function Toast({ toast, onClose }: ToastProps) {
    const config = typeConfig[toast.type];

    return (
        <div
            className={`${config.bg} ${config.border} elevation-4 motion-slide-in-right rounded-[20px] border p-4 max-w-sm w-full pointer-events-auto flex items-start gap-3 transition-all duration-300`}
            role="alert"
        >
            {config.icon}

            <div className="flex-1 min-w-0 pr-2">
                <h4 className={`text-sm font-semibold ${config.text} break-words leading-tight`}>
                    {toast.title}
                </h4>
                {toast.description && (
                    <p className="mt-1 text-sm text-neutral-500 break-words leading-snug">
                        {toast.description}
                    </p>
                )}
            </div>

            <button
                onClick={onClose}
                className="app-control h-8 w-8 rounded-full p-0 text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0"
                aria-label="Close"
            >
                <X size={16} />
            </button>
        </div>
    );
}
