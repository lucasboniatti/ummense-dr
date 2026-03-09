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
        ? 'rounded-[22px] border border-dashed border-[color:var(--border-strong)] bg-white/72 px-5 py-9'
        : 'app-surface min-h-[320px] justify-center px-6 py-16';

    return (
        <div className={`flex flex-col items-center text-center max-w-md mx-auto ${containerClasses}`}>
            {icon && (
                <div className="mb-4 rounded-full bg-[var(--accent-soft)] p-4 text-primary-600">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-neutral-800">{title}</h3>
            {description && (
                <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-500">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button variant="primary" onClick={onAction} className="mt-6">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
