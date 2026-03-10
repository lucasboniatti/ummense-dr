import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Response {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: string;
  elapsed: number;
}

interface ResponseInspectorProps {
  response: Response | null;
  onClose: () => void;
}

export const ResponseInspector: React.FC<ResponseInspectorProps> = ({
  response,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');

  if (!response) return null;

  const isSuccess = response.statusCode >= 200 && response.statusCode < 300;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm">
      <div className="app-surface flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] p-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="app-kicker">Teste</p>
              <h2 className="text-lg font-semibold">Resposta do webhook</h2>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-sm font-mono ${
                isSuccess
                  ? 'bg-success-100 text-success-800'
                  : 'bg-error-100 text-error-800'
              }`}
            >
              {response.statusCode}
            </span>
          </div>
          <button
            onClick={onClose}
            className="app-control h-9 w-9 rounded-full p-0 hover:bg-neutral-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-[color:var(--border-subtle)] bg-neutral-50/90 px-4 py-2 text-sm">
          <div className="flex gap-6">
            <div>
              <span className="text-neutral-600">Status: </span>
              <span className="font-mono font-semibold">
                {response.statusMessage}
              </span>
            </div>
            <div>
              <span className="text-neutral-600">Tempo: </span>
              <span className="font-mono font-semibold">{response.elapsed}ms</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-b border-[color:var(--border-subtle)] px-4 pt-3">
          <button
            onClick={() => setActiveTab('body')}
            className={`app-chip-toggle rounded-none border-x-0 border-t-0 px-3 py-2 text-sm ${
              activeTab === 'body'
                ? 'app-chip-toggle-active border-primary-500 text-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Corpo
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`app-chip-toggle rounded-none border-x-0 border-t-0 px-3 py-2 text-sm ${
              activeTab === 'headers'
                ? 'app-chip-toggle-active border-primary-500 text-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Headers
          </button>
        </div>

        <div className="overflow-auto flex-1 p-4">
          {activeTab === 'body' ? (
            <pre className="app-code-block max-h-96 font-mono text-sm">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(response.body), null, 2);
                } catch {
                  return response.body;
                }
              })()}
            </pre>
          ) : (
            <div className="space-y-2">
              {Object.entries(response.headers).map(([key, value]) => (
                <div
                  key={key}
                  className="app-surface-muted rounded-[16px] p-2 font-mono text-sm"
                >
                  <span className="font-semibold text-primary-600">{key}: </span>
                  <span className="text-neutral-900">{value as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--border-subtle)] bg-neutral-50/90 p-4">
          <button
            onClick={onClose}
            className="app-control h-10 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
