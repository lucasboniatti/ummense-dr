import React, { ErrorInfo, ReactNode } from 'react';

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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-8 h-8"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <p className="app-kicker">Falha de interface</p>
                        <h1 className="mb-2 text-2xl font-bold tracking-[-0.03em] text-neutral-900">Algo deu errado.</h1>
                        <p className="mb-6 text-neutral-600">
                            Um erro inesperado aconteceu enquanto processávamos sua solicitação. Nossos engenheiros já foram notificados.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="app-control h-11 w-full rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 font-semibold text-white transition-colors hover:bg-primary-700"
                            >
                                Recarregar Página
                            </button>
                            <button
                                onClick={() => {
                                    this.setState({ hasError: false, error: null });
                                    window.location.href = '/';
                                }}
                                className="app-control h-11 w-full rounded-[var(--radius-control)] px-4 font-semibold text-neutral-700 transition-colors"
                            >
                                Voltar ao Início
                            </button>
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
