import React, { useState, useEffect } from 'react';
import { controlService, CircuitBreakerState } from '../../services/control.service';
import { PageLoader } from '../../components/ui/PageLoader';
import { useToast } from '../../contexts/ToastContext';

const INITIAL_CONNECTORS = ['slack', 'email', 'custom_webhook'];

const CircuitBreakerPanel: React.FC = () => {
    const [connectors, setConnectors] = useState<Record<string, CircuitBreakerState>>({});
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // Quick refresh
    const loadStats = async () => {
        setLoading(true);
        try {
            const data: Record<string, CircuitBreakerState> = {};
            for (const connectorId of INITIAL_CONNECTORS) {
                try {
                    const state = await controlService.fetchCircuitBreaker(connectorId);
                    data[connectorId] = state;
                } catch (e) { /* ignore */ }
            }
            setConnectors(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStats(); }, []);

    const handleReset = async (connectorId: string) => {
        try {
            await controlService.resetCircuitBreaker(connectorId);
            toast.success('Circuit breaker resetado', `Estado reiniciado para o conector ${connectorId}.`);
            loadStats();
        } catch (err: any) {
            toast.error('Erro ao resetar', err.message);
        }
    };

    if (loading) return <PageLoader message="Carregando estados do circuito..." />;

    const getStatusColor = (state: string) => {
        if (state === 'healthy') return 'bg-success-100 text-success-800 border-success-200';
        if (state === 'degraded') return 'bg-warning-100 text-warning-800 border-warning-200';
        return 'bg-error-100 text-error-800 border-error-200';
    };

    return (
        <div className="app-page">
            <section className="app-page-hero animate-fade-up">
                <div className="app-page-heading">
                    <p className="app-kicker">Admin</p>
                    <h1 className="app-page-title">Circuit breaker</h1>
                    <p className="app-page-copy">Monitore saude dos conectores e execute resets com menos ruido visual e mais contexto.</p>
                </div>
            </section>

            <div className="app-surface mx-auto max-w-4xl p-6">
            <h2 className="mb-6 border-b border-[color:var(--border-subtle)] pb-3 text-xl font-bold text-neutral-800">Estados do Circuit Breaker</h2>

            <div className="space-y-6">
                {Object.entries(connectors).map(([connectorId, state]) => (
                    <div key={connectorId} className="app-surface-muted flex flex-col justify-between rounded-[20px] p-4 md:flex-row md:items-center">
                        <div>
                            <h4 className="font-semibold text-lg text-neutral-800 capitalize flex items-center gap-2">
                                {connectorId.replace('_', ' ')}
                                <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${getStatusColor(state.state)}`}>
                                    {state.state.toUpperCase()}
                                </span>
                            </h4>
                            <div className="text-sm text-neutral-500 mt-2 space-y-1">
                                <p><span className="font-semibold text-neutral-600">Falhas:</span> {state.failureCount}</p>
                                {state.lastFailureAt && <p><span className="font-semibold text-neutral-600">Última Falha:</span> {new Date(state.lastFailureAt).toLocaleString()}</p>}
                                {state.nextRetryAt && state.state === 'offline' && <p><span className="font-semibold text-neutral-600">Tentar Novamente:</span> {new Date(state.nextRetryAt).toLocaleString()}</p>}
                            </div>
                        </div>

                        <div className="mt-4 md:mt-0 flex items-center justify-end">
                            <button
                                onClick={() => handleReset(connectorId)}
                                disabled={state.state === 'healthy'}
                                className="app-control rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                            >
                                Forçar Reset
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
};

export default CircuitBreakerPanel;
