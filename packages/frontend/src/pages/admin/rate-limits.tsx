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
        <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-200 mt-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6 text-neutral-800 border-b pb-2">Configurações de Rate Limit</h2>

            <div className="space-y-6">
                {Object.entries(connectors).map(([connectorId, status]) => (
                    <div key={connectorId} className="flex flex-col md:flex-row md:items-center justify-between bg-neutral-50 p-4 rounded border">
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
                                    className="w-24 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-primary-500 outline-none"
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
                                    className="w-24 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-primary-500 outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded h-10 font-medium transition-colors"
                            >
                                Salvar
                            </button>
                        </form>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RateLimitsPanel;
