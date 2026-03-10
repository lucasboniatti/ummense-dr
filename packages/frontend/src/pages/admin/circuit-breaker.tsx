import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { controlService, CircuitBreakerState } from '../../services/control.service';
import { PageLoader } from '../../components/ui/PageLoader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressSegments } from '../../components/ui/ProgressSegments';
import { useToast } from '../../contexts/ToastContext';

const INITIAL_CONNECTORS = ['slack', 'email', 'custom_webhook'];

const CircuitBreakerPanel: React.FC = () => {
    const [connectors, setConnectors] = useState<Record<string, CircuitBreakerState>>({});
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const connectorEntries = Object.entries(connectors);
    const healthyCount = connectorEntries.filter(([, state]) => state.state === 'healthy').length;
    const degradedCount = connectorEntries.filter(([, state]) => state.state === 'degraded').length;
    const offlineCount = connectorEntries.filter(([, state]) => state.state === 'offline').length;
    const overallTone = offlineCount > 0 ? 'error' : degradedCount > 0 ? 'warning' : 'success';

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

    const getStatusTone = (state: string) => {
        if (state === 'healthy') return 'success';
        if (state === 'degraded') return 'warning';
        return 'error';
    };

    const getProgressFilled = (state: CircuitBreakerState['state']) => {
        if (state === 'healthy') return 4;
        if (state === 'degraded') return 2;
        return 1;
    };

    return (
        <div className="app-page">
            <section className="app-page-hero animate-fade-up">
                <div className="app-page-hero-grid gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="app-page-heading">
                            <p className="app-kicker">Admin</p>
                            <h1 className="app-page-title">Circuit breaker</h1>
                            <p className="app-page-copy">Monitore a saúde dos conectores, acompanhe degradações e execute resets com leitura rápida.</p>
                        </div>
                        <Button onClick={() => void loadStats()} variant="outline" className="gap-2">
                            <RefreshCw size={15} />
                            Atualizar leitura
                        </Button>
                    </div>

                    <div className="app-metric-strip">
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Conectores</p>
                                <Badge tone="neutral">{connectorEntries.length} totais</Badge>
                            </div>
                            <p className="app-metric-value">{connectorEntries.length}</p>
                            <p className="app-metric-copy">frentes monitoradas nesta vista</p>
                        </div>
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Saudáveis</p>
                                <Badge tone="success">ok</Badge>
                            </div>
                            <p className="app-metric-value">{healthyCount}</p>
                            <p className="app-metric-copy">operação normal e sem retentativas pendentes</p>
                        </div>
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Degradados</p>
                                <Badge tone="warning">atenção</Badge>
                            </div>
                            <p className="app-metric-value">{degradedCount}</p>
                            <p className="app-metric-copy">falhas recentes exigem monitoramento</p>
                        </div>
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Offline</p>
                                <Badge tone={offlineCount > 0 ? 'error' : 'neutral'}>risco</Badge>
                            </div>
                            <p className="app-metric-value">{offlineCount}</p>
                            <p className="app-metric-copy">conectores aguardando recuperação</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="app-surface mx-auto w-full max-w-5xl p-6">
                    <h2 className="mb-6 border-b border-[color:var(--border-subtle)] pb-3 font-display text-xl font-bold text-[color:var(--text-strong)]">Estados do circuit breaker</h2>

                    <div className="space-y-4">
                        {connectorEntries.map(([connectorId, state]) => (
                            <div key={connectorId} className="app-section-card">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="app-icon-tile h-11 w-11 rounded-2xl">
                                                {state.state === 'healthy' ? (
                                                    <ShieldCheck size={18} />
                                                ) : state.state === 'degraded' ? (
                                                    <Activity size={18} />
                                                ) : (
                                                    <ShieldX size={18} />
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-semibold capitalize text-[color:var(--text-strong)]">
                                                {connectorId.replace('_', ' ')}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge tone={getStatusTone(state.state)}>
                                                        {state.state.toUpperCase()}
                                                    </Badge>
                                                    <Badge tone="neutral">{state.failureCount} falhas</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-w-md">
                                            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                                                <span>Sinal do conector</span>
                                                <span>{state.state}</span>
                                            </div>
                                            <ProgressSegments
                                                filled={getProgressFilled(state.state)}
                                                total={4}
                                                color={state.state === 'healthy' ? 'success' : state.state === 'degraded' ? 'warning' : 'error'}
                                            />
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                                                    Última falha
                                                </p>
                                                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                                                    {state.lastFailureAt ? new Date(state.lastFailureAt).toLocaleString('pt-BR') : 'Sem falhas registradas'}
                                                </p>
                                            </div>
                                            <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                                                    Próxima tentativa
                                                </p>
                                                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                                                    {state.nextRetryAt && state.state === 'offline'
                                                        ? new Date(state.nextRetryAt).toLocaleString('pt-BR')
                                                        : 'Sem retentativa pendente'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <Button
                                            onClick={() => handleReset(connectorId)}
                                            disabled={state.state === 'healthy'}
                                            variant={state.state === 'healthy' ? 'outline' : 'primary'}
                                        >
                                            Forçar reset
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="app-note-card">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-[color:var(--text-strong)]">Saúde geral</h3>
                            <Badge tone={overallTone}>
                                {offlineCount > 0 ? 'ação necessária' : degradedCount > 0 ? 'monitorar' : 'estável'}
                            </Badge>
                        </div>
                        <p className="text-sm text-[color:var(--text-secondary)]">
                            {offlineCount > 0
                                ? 'Existe pelo menos um conector fora do ar nesta leitura.'
                                : degradedCount > 0
                                    ? 'A operação está de pé, mas com sinais de desgaste em alguns conectores.'
                                    : 'Todos os conectores estão dentro do comportamento esperado.'}
                        </p>
                    </div>
                    <div className="app-note-card flex gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                        <div>
                            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Leitura rápida</h3>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                                Use este painel para identificar quais conectores continuam saudáveis, quais entraram em degradação e quando um reset realmente faz sentido.
                            </p>
                        </div>
                    </div>
                    <div className="app-note-card flex gap-3">
                        {offlineCount > 0 ? (
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-error-500" />
                        ) : (
                            <Activity className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                        )}
                        <div>
                            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Sinal atual</h3>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                                {offlineCount > 0
                                    ? `${offlineCount} conectores estão offline. Vale revisar falhas recentes e janela de retentativa antes de acionar o reset.`
                                    : 'Nenhum conector offline nesta leitura. O foco fica em prevenção e acompanhamento de degradações.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CircuitBreakerPanel;
