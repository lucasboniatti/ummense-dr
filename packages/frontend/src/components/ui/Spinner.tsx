import React from 'react';

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-3',
    };

    return (
        <div
            className={`animate-spin rounded-full border-neutral-200 border-t-primary-600 ${sizeClasses[size]} ${className}`}
            role="status"
            aria-label="Carregando"
        />
    );
}
