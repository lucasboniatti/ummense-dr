import React from 'react';

interface ToastProps {
  message: string;
  tone?: 'error' | 'success';
  onDismiss: () => void;
}

const toneClasses = {
  error: {
    container: 'border-red-200 bg-red-50 text-red-800',
    button: 'text-red-700 hover:text-red-900',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    button: 'text-emerald-700 hover:text-emerald-900',
  },
};

export function Toast({
  message,
  tone = 'error',
  onDismiss,
}: ToastProps) {
  const classes = toneClasses[tone];

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${classes.container}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className={`font-semibold ${classes.button}`}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
