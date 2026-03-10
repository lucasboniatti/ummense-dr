import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="app-auth-shell">
                    <div className="app-auth-card w-full max-w-md text-center">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error-100 text-error-600">
                            <AlertTriangle className="h-8 w-8" />
                        </div>

                        <p className="app-kicker">Falha de interface</p>
                        <h1 className="mb-2 text-2xl font-bold tracking-[-0.03em] text-neutral-900">Algo deu errado.</h1>
                        <p className="mb-6 text-neutral-600">
                            Um erro inesperado aconteceu enquanto processávamos sua solicitação. Nossos engenheiros já foram notificados.
                        </p>

                        <div className="space-y-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full"
                                variant="primary"
                            >
                                Recarregar Página
                            </Button>
                            <Button
                                onClick={() => {
                                    this.setState({ hasError: false, error: null });
                                    window.location.href = '/';
                                }}
                                className="w-full"
                                variant="outline"
                            >
                                Voltar ao Início
                            </Button>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mt-6 text-left">
                                <p className="text-xs font-semibold text-error-700 mb-1">Detalhes do erro (apenas Dev):</p>
                                <pre className="app-code-block max-h-32 text-[10px] text-error-800">
                                    {this.state.error.toString()}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
