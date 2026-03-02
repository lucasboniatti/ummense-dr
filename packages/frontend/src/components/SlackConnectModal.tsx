import React, { useState, useEffect } from 'react';
import { integrationService } from '../services/integration.service';

interface SlackConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SlackConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: SlackConnectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      generateAuthUrl();
    }
  }, [isOpen]);

  const generateAuthUrl = async () => {
    setLoading(true);
    setError(null);

    try {
      const { auth_url } = await integrationService.getSlackAuthUrl();
      setAuthUrl(auth_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar URL de autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (authUrl) {
      // Store window reference to track callback
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        authUrl,
        'SlackAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (authWindow) {
        const checkWindow = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkWindow);
            // Refresh integrations on success
            if (onSuccess) {
              onSuccess();
            }
          }
        }, 1000);
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Conectar Slack</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Clique no botão abaixo para autorizar a integração com sua workspace do Slack.
          </p>

          <div className="bg-gray-100 p-4 rounded mb-4">
            <p className="text-sm text-gray-600">
              <strong>O que você está autorizando:</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc">
              <li>Enviar mensagens em canais selecionados</li>
              <li>Fazer upload de arquivos</li>
              <li>Listar canais da workspace</li>
              <li>Responder a comandos slash</li>
            </ul>
          </div>

          {authUrl && (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full px-4 py-3 bg-slack-color text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity font-medium"
              style={{ backgroundColor: '#36C5F0' }}
            >
              {loading ? 'Preparando...' : 'Conectar com Slack'}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
