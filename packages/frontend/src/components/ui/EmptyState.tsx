import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: 'default' | 'compact';
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    variant = 'default',
}: EmptyStateProps) {
    const containerClasses = variant === 'compact'
        ? 'py-8 px-4 border border-dashed border-neutral-300 rounded-lg'
        : 'py-16 px-6 min-h-[400px] flex-col justify-center';

    return (
        <div className={`flex flex-col items-center text-center max-w-md mx-auto ${containerClasses}`}>
            {icon && (
                <div className="text-neutral-300 mb-4 bg-neutral-50 p-4 rounded-full">
                    {icon}
                </div>
            )}
            <h3 className="text-neutral-700 font-semibold text-lg">{title}</h3>
            {description && (
                <p className="text-neutral-500 text-sm mt-2 font-medium leading-relaxed">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button variant="primary" onClick={onAction} className="mt-6 shadow-sm">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
