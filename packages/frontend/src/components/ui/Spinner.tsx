import React from 'react';
import { cn } from '@/lib/utils';

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
            className={cn(
                'animate-spin rounded-full border-[color:var(--border-default)] border-t-[color:var(--text-accent)]',
                sizeClasses[size],
                className
            )}
            role="status"
            aria-label="Carregando"
        />
    );
}
