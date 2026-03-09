import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: ToastMessage[];
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (toast: Omit<ToastMessage, 'id'>) => {
            const id = Math.random().toString(36).substring(2, 9);
            const newToast = { ...toast, id };
            setToasts((prev) => [...prev, newToast]);

            const duration = toast.duration ?? 4000;
            if (duration > 0) {
                setTimeout(() => removeToast(id), duration);
            }
        },
        [removeToast]
    );

    const success = useCallback((title: string, description?: string) => addToast({ type: 'success', title, description }), [addToast]);
    const error = useCallback((title: string, description?: string) => addToast({ type: 'error', title, description }), [addToast]);
    const info = useCallback((title: string, description?: string) => addToast({ type: 'info', title, description }), [addToast]);
    const warning = useCallback((title: string, description?: string) => addToast({ type: 'warning', title, description }), [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
