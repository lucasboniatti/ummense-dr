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
            setMessage({ text: err.message || 'Operacao falhou', type: 'error' });
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
            <div className="app-surface mt-4 p-4">
                <div className="mb-4">
                    <p className="app-kicker">Controle</p>
                    <h3 className="mt-2 text-lg font-semibold text-neutral-800">Controles da fila</h3>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleAction('pause')}
                        disabled={loadingAction !== null}
                        className="app-control rounded-[var(--radius-control)] border-transparent bg-warning-500 px-4 py-2 font-medium text-white transition-colors hover:bg-warning-600 disabled:opacity-50"
                    >
                        {loadingAction === 'pause' ? 'Pausando...' : 'Pausar fila'}
                    </button>

                    <button
                        onClick={() => handleAction('resume')}
                        disabled={loadingAction !== null}
                        className="app-control rounded-[var(--radius-control)] border-transparent bg-success-500 px-4 py-2 font-medium text-white transition-colors hover:bg-success-600 disabled:opacity-50"
                    >
                        {loadingAction === 'resume' ? 'Retomando...' : 'Retomar fila'}
                    </button>

                    <button
                        onClick={handleClearConfirm}
                        disabled={loadingAction !== null}
                        className="app-control ml-auto rounded-[var(--radius-control)] border-transparent bg-error-500 px-4 py-2 font-medium text-white transition-colors hover:bg-error-600 disabled:opacity-50"
                    >
                        {loadingAction === 'clear' ? 'Limpando...' : 'Limpar fila'}
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 rounded-[18px] p-3 text-sm font-medium ${message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'}`}>
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
