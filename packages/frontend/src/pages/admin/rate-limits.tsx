import React, { useState, useEffect } from 'react';
import { RateLimitStatus } from '../../services/control.service';
import { apiClient } from '../../services/api.client';
import { PageLoader } from '../../components/ui/PageLoader';
import { useToast } from '../../contexts/ToastContext';

const INITIAL_CONNECTORS = ['slack', 'email', 'custom_webhook'];

const RateLimitsPanel: React.FC = () => {
    const [connectors, setConnectors] = useState<Record<string, RateLimitStatus>>({});
    const [loading, setLoading] = useState(true);
    const toast = useToast();

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
                <div className="app-page-heading">
                    <p className="app-kicker">Admin</p>
                    <h1 className="app-page-title">Rate limits</h1>
                    <p className="app-page-copy">Ajuste limites por conector sem sair da mesma linguagem visual do sistema.</p>
                </div>
            </section>

            <div className="app-surface mx-auto max-w-4xl p-6">
            <h2 className="border-b border-[color:var(--border-subtle)] pb-3 text-xl font-bold text-neutral-800">Configurações de Rate Limit</h2>

            <div className="space-y-6">
                {Object.entries(connectors).map(([connectorId, status]) => (
                    <div key={connectorId} className="app-surface-muted flex flex-col justify-between rounded-[20px] p-4 md:flex-row md:items-center">
                        <div className="mb-4 md:mb-0">
                            <h4 className="font-semibold text-lg text-neutral-800 capitalize">{connectorId.replace('_', ' ')}</h4>
                            <p className="text-sm text-neutral-500 font-mono text-xs">{connectorId}</p>
                        </div>

                        <form
                            className="flex items-end gap-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const rps = parseInt((form.elements.namedItem('rps') as HTMLInputElement).value, 10);
                                const concurrent = parseInt((form.elements.namedItem('concurrent') as HTMLInputElement).value, 10);
                                handleUpdate(connectorId, rps, concurrent);
                            }}
                        >
                            <div>
                                <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">Limite RPS</label>
                                <input
                                    type="number"
                                    name="rps"
                                    defaultValue={status.rps}
                                    min="1"
                                    className="app-control h-10 w-24 rounded-[var(--radius-control)] px-3 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1">Concorrentes</label>
                                <input
                                    type="number"
                                    name="concurrent"
                                    defaultValue={status.concurrent}
                                    min="1"
                                    className="app-control h-10 w-24 rounded-[var(--radius-control)] px-3 outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="app-control h-10 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 font-medium text-white transition-colors hover:bg-primary-700"
                            >
                                Salvar
                            </button>
                        </form>
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
};

export default RateLimitsPanel;
