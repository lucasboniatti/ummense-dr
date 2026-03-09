import React from 'react';
import { Spinner } from './Spinner';

export interface PageLoaderProps {
    message?: string;
}

export function PageLoader({ message = 'Carregando...' }: PageLoaderProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
            <Spinner size="lg" className="mb-4" />
            <p className="text-neutral-500 font-medium">{message}</p>
        </div>
    );
}
