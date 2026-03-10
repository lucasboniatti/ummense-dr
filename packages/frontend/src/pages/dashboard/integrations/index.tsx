import React, { useState, useEffect } from 'react';
import { Gamepad2, MessageSquare } from 'lucide-react';
import { IntegrationCard } from '../../../components/IntegrationCard';
import { SlackConnectModal } from '../../../components/SlackConnectModal';
import { DiscordConnectModal } from '../../../components/DiscordConnectModal';
import {
  integrationService,
  SlackIntegration,
  DiscordIntegration,
} from '../../../services/integration.service';
import {
  Button,
  EmptyState,
  PageLoader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui';

export default function IntegrationsPage() {
  const [slackIntegrations, setSlackIntegrations] = useState<SlackIntegration[]>([]);
  const [discordIntegrations, setDiscordIntegrations] = useState<DiscordIntegration[]>([]);
  const [activeTab, setActiveTab] = useState('slack');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);

  useEffect(() => {
    void loadIntegrations();
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
    void loadIntegrations();
  };

  const handleConnectionSuccess = () => {
    setShowSlackModal(false);
    setShowDiscordModal(false);
    void loadIntegrations();
  };

  if (loading) {
    return <PageLoader message="Carregando integrações..." />;
  }

  return (
    <div className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-heading">
          <p className="app-kicker">Integracoes</p>
          <h1 className="app-page-title">Integrações</h1>
          <p className="app-page-copy">
            Conecte Slack e Discord ao seu workspace para disparar mensagens automatizadas.
          </p>
        </div>
      </section>

      {error && (
        <div className="app-inline-banner app-inline-banner-error">
          <strong>Integrações</strong>
          {error}
          <button onClick={loadIntegrations} className="text-sm font-semibold underline">
            Tentar novamente
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="app-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">Canais conectados</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-neutral-900">
              Hub de integrações
            </h2>
          </div>
          <TabsList variant="pills">
            <TabsTrigger value="slack" variant="pills" onClick={() => setActiveTab('slack')}>
              Slack
            </TabsTrigger>
            <TabsTrigger value="discord" variant="pills" onClick={() => setActiveTab('discord')}>
              Discord
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="slack" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em]">
                <MessageSquare size={22} />
                Slack
              </h3>
              <p className="mt-1 text-neutral-600">
                Conecte seu workspace para enviar mensagens automatizadas.
              </p>
            </div>
            {slackIntegrations.length === 0 && (
              <Button onClick={() => setShowSlackModal(true)} variant="primary">
                Conectar Slack
              </Button>
            )}
          </div>

          {slackIntegrations.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        </TabsContent>

        <TabsContent value="discord" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em]">
                <Gamepad2 size={22} />
                Discord
              </h3>
              <p className="mt-1 text-neutral-600">
                Conecte seu servidor para acionar bots e canais automaticamente.
              </p>
            </div>
            {discordIntegrations.length === 0 && (
              <Button onClick={() => setShowDiscordModal(true)} variant="primary">
                Conectar Discord
              </Button>
            )}
          </div>

          {discordIntegrations.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        </TabsContent>
      </Tabs>

      <div className="app-inline-banner app-inline-banner-success">
        <h3 className="mb-2 font-semibold text-primary-900">Guia rápido</h3>
        <p className="text-sm text-primary-800">
          Após conectar uma integração, você pode configurar regras para enviar mensagens
          automaticamente para canais específicos do Slack ou Discord quando eventos forem
          executados.
        </p>
      </div>

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
    </div>
  );
}
