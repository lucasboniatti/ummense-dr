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
        ? 'rounded-[24px] border border-[color:var(--border-default)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-raised)_96%,transparent)_0%,color-mix(in_srgb,var(--surface-card)_98%,transparent)_100%)] px-6 py-10 shadow-[var(--shadow-soft)]'
        : 'app-surface min-h-[340px] justify-center px-8 py-14';

    return (
        <div className={`mx-auto flex max-w-lg flex-col items-center text-center ${containerClasses}`}>
            {icon && (
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--border-accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)] shadow-[var(--shadow-primary-day)]">
                    {icon}
                </div>
            )}
            <p className="app-kicker mb-2">Sem itens nesta etapa</p>
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--text-strong)]">{title}</h3>
            {description && (
                <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-[color:var(--text-secondary)]">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button variant="primary" onClick={onAction} className="mt-7">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
