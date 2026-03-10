import React, { useState, useEffect } from 'react';
import { Gauge, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { RateLimitStatus } from '../../services/control.service';
import { apiClient } from '../../services/api.client';
import { PageLoader } from '../../components/ui/PageLoader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';

const INITIAL_CONNECTORS = ['slack', 'email', 'custom_webhook'];

const RateLimitsPanel: React.FC = () => {
    const [connectors, setConnectors] = useState<Record<string, RateLimitStatus>>({});
    const [drafts, setDrafts] = useState<Record<string, { rps: string; concurrent: string }>>({});
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const connectorEntries = Object.entries(connectors);
    const totalRps = connectorEntries.reduce((acc, [, status]) => acc + status.rps, 0);
    const totalConcurrent = connectorEntries.reduce((acc, [, status]) => acc + status.concurrent, 0);

    // Quick refresh
    const loadRates = async () => {
        setLoading(true);
        try {
            const data: Record<string, RateLimitStatus> = {};
            for (const connectorId of INITIAL_CONNECTORS) {
                try {
                    const res = await apiClient.get(`/automations/rate-limit/${connectorId}`);
                    data[connectorId] = res.data;
                } catch (e) { /* ignore */ }
            }
            setConnectors(data);
            setDrafts(
                Object.fromEntries(
                    Object.entries(data).map(([connectorId, status]) => [
                        connectorId,
                        {
                            rps: String(status.rps),
                            concurrent: String(status.concurrent),
                        },
                    ])
                )
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRates(); }, []);

    const handleUpdate = async (connectorId: string, rps: number, concurrent: number) => {
        try {
            await apiClient.post('/automations/rate-limit', { connectorId, rps, concurrent });
            toast.success('Rate limit atualizado', 'As configurações foram salvas com sucesso.');
            loadRates();
        } catch (err: any) {
            toast.error('Falha ao atualizar', err.message);
        }
    };

    if (loading) return <PageLoader message="Carregando configurações de rate limit..." />;

    return (
        <div className="app-page">
            <section className="app-page-hero animate-fade-up">
                <div className="app-page-hero-grid gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="app-page-heading">
                            <p className="app-kicker">Admin</p>
                            <h1 className="app-page-title">Rate limits</h1>
                            <p className="app-page-copy">Ajuste limites por conector com leitura executiva, valores claros e menos ruído operacional.</p>
                        </div>
                        <Button onClick={() => void loadRates()} variant="outline" className="gap-2">
                            <RefreshCw size={15} />
                            Atualizar leitura
                        </Button>
                    </div>

                    <div className="app-metric-strip">
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Conectores</p>
                                <Badge tone="neutral">{connectorEntries.length} ativos</Badge>
                            </div>
                            <p className="app-metric-value">{connectorEntries.length}</p>
                            <p className="app-metric-copy">perfis configurados nesta superfície</p>
                        </div>
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Capacidade RPS</p>
                                <Badge tone="info">req/s</Badge>
                            </div>
                            <p className="app-metric-value">{totalRps}</p>
                            <p className="app-metric-copy">soma dos limites configurados</p>
                        </div>
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Concorrência</p>
                                <Badge tone="success">slots</Badge>
                            </div>
                            <p className="app-metric-value">{totalConcurrent}</p>
                            <p className="app-metric-copy">capacidade paralela total</p>
                        </div>
                        <div className="app-metric-tile">
                            <div className="flex items-center justify-between gap-3">
                                <p className="app-metric-label">Perfil médio</p>
                                <Badge tone="neutral">rps/conector</Badge>
                            </div>
                            <p className="app-metric-value">
                                {connectorEntries.length > 0 ? Math.round(totalRps / connectorEntries.length) : 0}
                            </p>
                            <p className="app-metric-copy">distribuição média dos limites</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="app-surface mx-auto w-full max-w-5xl p-6">
                    <h2 className="border-b border-[color:var(--border-subtle)] pb-3 font-display text-xl font-bold text-[color:var(--text-strong)]">Configurações de rate limit</h2>

                    <div className="space-y-4">
                        {connectorEntries.map(([connectorId, status]) => (
                            <div key={connectorId} className="app-section-card">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-lg font-semibold capitalize text-[color:var(--text-strong)]">{connectorId.replace('_', ' ')}</h4>
                                            <Badge tone="neutral">{connectorId}</Badge>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                                                    Perfil atual
                                                </p>
                                                <p className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">
                                                    {status.rps} req/s
                                                </p>
                                                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                                                    throughput sustentado
                                                </p>
                                            </div>
                                            <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                                                    Concorrência
                                                </p>
                                                <p className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">
                                                    {status.concurrent} slots
                                                </p>
                                                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                                                    paralelismo por conector
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <form
                                        className="grid gap-3 sm:grid-cols-[120px_140px_auto]"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const draft = drafts[connectorId];
                                            const rps = parseInt(draft?.rps || String(status.rps), 10);
                                            const concurrent = parseInt(draft?.concurrent || String(status.concurrent), 10);
                                            handleUpdate(connectorId, rps, concurrent);
                                        }}
                                    >
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold uppercase text-[color:var(--text-secondary)]">Limite RPS</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={drafts[connectorId]?.rps ?? String(status.rps)}
                                                onChange={(event) =>
                                                    setDrafts((previous) => ({
                                                        ...previous,
                                                        [connectorId]: {
                                                            rps: event.target.value,
                                                            concurrent: previous[connectorId]?.concurrent ?? String(status.concurrent),
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold uppercase text-[color:var(--text-secondary)]">Concorrentes</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={drafts[connectorId]?.concurrent ?? String(status.concurrent)}
                                                onChange={(event) =>
                                                    setDrafts((previous) => ({
                                                        ...previous,
                                                        [connectorId]: {
                                                            rps: previous[connectorId]?.rps ?? String(status.rps),
                                                            concurrent: event.target.value,
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button type="submit" variant="primary" size="sm" className="h-11 w-full">
                                                Salvar
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="app-note-card flex gap-3">
                        <Gauge className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                        <div>
                            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Leitura rápida</h3>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                                Ajuste RPS e concorrência por conector para equilibrar throughput, proteger integrações externas e reduzir gargalos.
                            </p>
                        </div>
                    </div>
                    <div className="app-note-card flex gap-3">
                        <Zap className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                        <div>
                            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Critério prático</h3>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                                Suba os limites quando a fila estiver saudável e reduza quando conectores externos começarem a responder com lentidão ou instabilidade.
                            </p>
                        </div>
                    </div>
                    <div className="app-note-card flex gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
                        <div>
                            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Baseline atual</h3>
                            <p className="text-sm text-[color:var(--text-secondary)]">
                                Hoje a superfície soma {totalRps} req/s e {totalConcurrent} slots de concorrência distribuídos entre os conectores monitorados.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RateLimitsPanel;
