import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Toast } from './Toast';

export function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed inset-x-0 top-4 z-[9999] mx-auto flex w-[min(calc(100%-2rem),24rem)] flex-col gap-3 px-0 pointer-events-none md:inset-x-auto md:right-4 md:mx-0 md:w-full md:max-w-sm">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}
