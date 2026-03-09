import React, { useState } from 'react';
import { controlService } from '../services/control.service';
import { ConfirmDialog } from './ui/ConfirmDialog';

export const PauseResumeControls: React.FC = () => {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const handleAction = async (action: 'pause' | 'resume' | 'clear') => {
        setLoadingAction(action);
        setMessage(null);
        try {
            let res;
            if (action === 'pause') res = await controlService.pauseQueue();
            if (action === 'resume') res = await controlService.resumeQueue();
            if (action === 'clear') {
                res = await controlService.clearQueue();
            }

            setMessage({ text: res?.message || 'Success', type: 'success' });
        } catch (err: any) {
            setMessage({ text: err.message || 'Operation failed', type: 'error' });
        } finally {
            setLoadingAction(null);
            setShowClearConfirm(false);
            // Auto-clear message after 3s
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleClearConfirm = () => {
        setShowClearConfirm(true);
    };

    return (
        <>
            <div className="bg-white p-4 rounded-lg shadow-md border border-neutral-200 mt-4">
                <h3 className="text-lg font-semibold mb-4 text-neutral-800">Queue Controls</h3>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleAction('pause')}
                        disabled={loadingAction !== null}
                        className="bg-warning-500 hover:bg-warning-600 text-white px-4 py-2 rounded shadow font-medium transition-colors disabled:opacity-50"
                    >
                        {loadingAction === 'pause' ? 'Pausing...' : 'Pause Queue'}
                    </button>

                    <button
                        onClick={() => handleAction('resume')}
                        disabled={loadingAction !== null}
                        className="bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded shadow font-medium transition-colors disabled:opacity-50"
                    >
                        {loadingAction === 'resume' ? 'Resuming...' : 'Resume Queue'}
                    </button>

                    <button
                        onClick={handleClearConfirm}
                        disabled={loadingAction !== null}
                        className="bg-error-500 hover:bg-error-600 text-white px-4 py-2 rounded shadow font-medium transition-colors ml-auto disabled:opacity-50"
                    >
                        {loadingAction === 'clear' ? 'Clearing...' : 'Clear Queue'}
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded text-sm font-medium ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showClearConfirm}
                onOpenChange={setShowClearConfirm}
                title="Limpar fila de execução"
                description="Tem certeza que deseja limpar toda a fila de execução? Esta ação não pode ser desfeita."
                confirmLabel="Limpar fila"
                cancelLabel="Cancelar"
                variant="danger"
                loading={loadingAction === 'clear'}
                onConfirm={() => handleAction('clear')}
            />
        </>
    );
};
