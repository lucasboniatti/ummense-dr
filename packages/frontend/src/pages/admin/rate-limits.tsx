import React, { useState, useEffect } from 'react';
import { RateLimitStatus } from '../../services/control.service';

const INITIAL_CONNECTORS = ['slack', 'email', 'custom_webhook'];

const RateLimitsPanel: React.FC = () => {
    const [connectors, setConnectors] = useState<Record<string, RateLimitStatus>>({});
    const [loading, setLoading] = useState(true);

    // Quick refresh
    const loadRates = async () => {
        setLoading(true);
        try {
            const data: Record<string, RateLimitStatus> = {};
            for (const connectorId of INITIAL_CONNECTORS) {
                try {
                    const res = await fetch(`/api/automations/rate-limit/${connectorId}`);
                    if (res.ok) {
                        data[connectorId] = await res.json();
                    }
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
            const res = await fetch('/api/automations/rate-limit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connectorId, rps, concurrent })
            });
            if (res.ok) {
                alert('Updated successfully');
                loadRates();
            } else {
                const d = await res.json();
                alert(`Failed: ${d.error}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Rate Limit Configurations</h2>

            <div className="space-y-6">
                {Object.entries(connectors).map(([connectorId, status]) => (
                    <div key={connectorId} className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 p-4 rounded border">
                        <div className="mb-4 md:mb-0">
                            <h4 className="font-semibold text-lg text-gray-800 capitalize">{connectorId.replace('_', ' ')}</h4>
                            <p className="text-sm text-gray-500 font-mono text-xs">{connectorId}</p>
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
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">RPS Limit</label>
                                <input
                                    type="number"
                                    name="rps"
                                    defaultValue={status.rps}
                                    min="1"
                                    className="w-24 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Concurrent</label>
                                <input
                                    type="number"
                                    name="concurrent"
                                    defaultValue={status.concurrent}
                                    min="1"
                                    className="w-24 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded h-10 font-medium transition-colors"
                            >
                                Save
                            </button>
                        </form>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RateLimitsPanel;
