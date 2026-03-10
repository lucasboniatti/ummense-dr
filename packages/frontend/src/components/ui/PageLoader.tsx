import React from 'react';
import { Spinner } from './Spinner';

export interface PageLoaderProps {
    message?: string;
}

export function PageLoader({ message = 'Carregando...' }: PageLoaderProps) {
    return (
        <div className="app-surface-muted motion-fade-in flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[22px] p-8 text-center">
            <Spinner size="lg" />
            <div className="space-y-1">
                <p className="app-kicker">Sincronizando</p>
                <p className="text-sm font-medium text-[color:var(--text-secondary)]">{message}</p>
            </div>
        </div>
    );
}
