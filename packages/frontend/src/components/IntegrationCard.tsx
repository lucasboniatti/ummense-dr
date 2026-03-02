import React, { useState } from 'react';
import { integrationService, SlackIntegration, DiscordIntegration } from '../services/integration.service';

type Integration = SlackIntegration | DiscordIntegration;

interface IntegrationCardProps {
  integration: Integration;
  type: 'slack' | 'discord';
  onDisconnect?: () => void;
  onConnect?: () => void;
}

export function IntegrationCard({
  integration,
  type,
  onDisconnect,
  onConnect,
}: IntegrationCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSlack = type === 'slack';
  const integrationName = isSlack
    ? (integration as SlackIntegration).workspace_name
    : (integration as DiscordIntegration).guild_name;

  const handleDisconnect = async () => {
    if (!window.confirm(`Tem certeza que deseja desconectar ${integrationName}?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSlack) {
        await integrationService.disconnectSlack(integration.id);
      } else {
        await integrationService.disconnectDiscord(integration.id);
      }

      if (onDisconnect) {
        onDisconnect();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSlack) {
        await integrationService.testSlackConnection(integration.id);
      } else {
        await integrationService.testDiscordConnection(integration.id);
      }
      alert('Conexão testada com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao testar conexão');
    } finally {
      setLoading(false);
    }
  };

  const icon = isSlack ? '🎯' : '🎮';
  const statusColor = integration.enabled ? 'bg-green-100' : 'bg-gray-100';
  const statusText = integration.enabled ? 'Conectado' : 'Desconectado';

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="text-lg font-semibold">{integrationName}</h3>
            <p className="text-sm text-gray-500">
              {isSlack ? 'Slack Workspace' : 'Discord Server'}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 text-sm text-gray-600">
        <p>
          <strong>ID:</strong> {integration.id}
        </p>
        <p>
          <strong>Conectado em:</strong>{' '}
          {new Date(integration.created_at).toLocaleDateString('pt-BR')}
        </p>
        {integration.expires_at && (
          <p>
            <strong>Expira em:</strong>{' '}
            {new Date(integration.expires_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Testando...' : 'Testar'}
        </button>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Desconectando...' : 'Desconectar'}
        </button>
      </div>
    </div>
  );
}
