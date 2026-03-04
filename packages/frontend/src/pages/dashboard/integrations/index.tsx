import React, { useState, useEffect } from 'react';
import { IntegrationCard } from '../../../components/IntegrationCard';
import { SlackConnectModal } from '../../../components/SlackConnectModal';
import { DiscordConnectModal } from '../../../components/DiscordConnectModal';
import { integrationService, SlackIntegration, DiscordIntegration } from '../../../services/integration.service';

export default function IntegrationsPage() {
  const [slackIntegrations, setSlackIntegrations] = useState<SlackIntegration[]>([]);
  const [discordIntegrations, setDiscordIntegrations] = useState<DiscordIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);

    try {
      const [slack, discord] = await Promise.all([
        integrationService.listSlackIntegrations(),
        integrationService.listDiscordIntegrations(),
      ]);

      setSlackIntegrations(slack);
      setDiscordIntegrations(discord);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationRemoved = () => {
    loadIntegrations();
  };

  const handleConnectionSuccess = () => {
    setShowSlackModal(false);
    setShowDiscordModal(false);
    loadIntegrations();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando integrações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integrações</h1>
        <p className="text-neutral-600">
          Conecte sua conta a Slack e Discord para enviar mensagens automatizadas.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-error-100 border border-error-300 rounded-lg text-error-800">
          {error}
          <button
            onClick={loadIntegrations}
            className="ml-4 underline hover:font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Slack Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span>🎯</span> Slack
            </h2>
            <p className="text-neutral-600 mt-1">Conecte sua workspace do Slack</p>
          </div>
          {slackIntegrations.length === 0 && (
            <button
              onClick={() => setShowSlackModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Conectar Slack
            </button>
          )}
        </div>

        {slackIntegrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {slackIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                type="slack"
                onDisconnect={handleIntegrationRemoved}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 bg-neutral-50 rounded-lg border border-neutral-200 text-center mb-6">
            <p className="text-neutral-600 mb-4">Nenhuma integração Slack conectada</p>
            <button
              onClick={() => setShowSlackModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Conectar Slack
            </button>
          </div>
        )}
      </div>

      {/* Discord Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span>🎮</span> Discord
            </h2>
            <p className="text-neutral-600 mt-1">Conecte seu servidor Discord</p>
          </div>
          {discordIntegrations.length === 0 && (
            <button
              onClick={() => setShowDiscordModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Conectar Discord
            </button>
          )}
        </div>

        {discordIntegrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discordIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                type="discord"
                onDisconnect={handleIntegrationRemoved}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
            <p className="text-neutral-600 mb-4">Nenhuma integração Discord conectada</p>
            <button
              onClick={() => setShowDiscordModal(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Conectar Discord
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <SlackConnectModal
        isOpen={showSlackModal}
        onClose={() => setShowSlackModal(false)}
        onSuccess={handleConnectionSuccess}
      />

      <DiscordConnectModal
        isOpen={showDiscordModal}
        onClose={() => setShowDiscordModal(false)}
        onSuccess={handleConnectionSuccess}
      />

      {/* Info Box */}
      <div className="mt-12 p-6 bg-primary-50 rounded-lg border border-primary-200">
        <h3 className="font-semibold text-primary-900 mb-2">💡 Dica</h3>
        <p className="text-primary-800 text-sm">
          Após conectar uma integração, você pode configurar regras para enviar mensagens
          automaticamente para canais específicos do Slack ou Discord quando eventos são
          executados.
        </p>
      </div>
    </div>
  );
}
