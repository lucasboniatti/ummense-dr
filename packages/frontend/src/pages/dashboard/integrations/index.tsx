import React, { useState, useEffect } from 'react';
import { IntegrationCard } from '../../../components/IntegrationCard';
import { SlackConnectModal } from '../../../components/SlackConnectModal';
import { DiscordConnectModal } from '../../../components/DiscordConnectModal';
import { integrationService, SlackIntegration, DiscordIntegration } from '../../../services/integration.service';
import { PageLoader, EmptyState } from '../../../components/ui';
import { MessageSquare, Gamepad2 } from 'lucide-react';

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
    return <PageLoader message="Carregando integrações..." />;
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
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="Nenhuma integração Slack"
            description="Conecte sua conta do Slack para receber notificações e executar ações nos seus canais."
            actionLabel="Conectar Slack"
            onAction={() => setShowSlackModal(true)}
            variant="compact"
          />
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
          <EmptyState
            icon={<Gamepad2 size={48} />}
            title="Nenhuma integração Discord"
            description="Conecte seu servidor do Discord para interagir através de bots e canais."
            actionLabel="Conectar Discord"
            onAction={() => setShowDiscordModal(true)}
            variant="compact"
          />
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
