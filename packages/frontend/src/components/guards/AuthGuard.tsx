import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/auth/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="app-auth-shell">
                <div className="app-auth-card flex flex-col items-center gap-4 text-center">
                    <div className="h-11 w-11 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
                    <div className="space-y-1">
                        <p className="app-kicker">Sessao</p>
                        <p className="text-sm font-medium text-neutral-600">Carregando acesso ao workspace...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
