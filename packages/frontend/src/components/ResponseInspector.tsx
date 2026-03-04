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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Resposta do Webhook</h2>
            <span
              className={`text-sm font-mono px-2 py-1 rounded ${
                isSuccess
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {response.statusCode}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status & Timing */}
        <div className="px-4 py-2 bg-neutral-50 border-b text-sm">
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

        {/* Tabs */}
        <div className="flex gap-4 px-4 pt-3 border-b">
          <button
            onClick={() => setActiveTab('body')}
            className={`py-2 px-3 font-medium text-sm border-b-2 ${
              activeTab === 'body'
                ? 'border-blue-500 text-primary-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Corpo
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`py-2 px-3 font-medium text-sm border-b-2 ${
              activeTab === 'headers'
                ? 'border-blue-500 text-primary-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Headers
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 p-4">
          {activeTab === 'body' ? (
            <pre className="font-mono text-sm bg-neutral-50 p-3 rounded overflow-auto max-h-96 border">
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
                  className="font-mono text-sm bg-neutral-50 p-2 rounded border"
                >
                  <span className="font-semibold text-primary-600">{key}: </span>
                  <span className="text-neutral-900">{value as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-neutral-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
