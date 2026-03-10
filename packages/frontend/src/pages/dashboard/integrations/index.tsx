import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Gamepad2, MessageSquare, Sparkles } from 'lucide-react';
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
  Badge,
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
  const slackCount = slackIntegrations.length;
  const discordCount = discordIntegrations.length;
  const totalConnections = slackCount + discordCount;
  const connectedProviders = Number(slackCount > 0) + Number(discordCount > 0);

  useEffect(() => {
    void loadIntegrations();
  }, []);

  const normalizeIntegrations = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) {
      return value as T[];
    }

    if (
      value &&
      typeof value === 'object' &&
      'integrations' in value &&
      Array.isArray((value as { integrations?: unknown[] }).integrations)
    ) {
      return (value as { integrations: T[] }).integrations;
    }

    return [];
  };

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);

    try {
      const [slack, discord] = await Promise.all([
        integrationService.listSlackIntegrations(),
        integrationService.listDiscordIntegrations(),
      ]);

      setSlackIntegrations(normalizeIntegrations<SlackIntegration>(slack));
      setDiscordIntegrations(normalizeIntegrations<DiscordIntegration>(discord));
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
        <div className="app-page-hero-grid gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="app-page-heading">
              <p className="app-kicker">Integrações</p>
              <h1 className="app-page-title">Integrações</h1>
              <p className="app-page-copy">
                Conecte Slack e Discord ao workspace para centralizar alertas, disparos e trilhas de automação.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowSlackModal(true)} variant="outline" className="gap-1.5">
                Slack
                <ArrowUpRight size={14} />
              </Button>
              <Button onClick={() => setShowDiscordModal(true)} variant="primary" className="gap-1.5">
                Discord
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Conexoes ativas
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                {totalConnections}
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                canais prontos para mensagens automatizadas
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Cobertura
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {connectedProviders}/2
                </p>
                <Badge tone={connectedProviders === 2 ? 'success' : 'warning'}>
                  provedores
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Slack e Discord na mesma trilha operacional
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Slack
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {slackCount}
                </p>
                <Badge tone={slackCount > 0 ? 'success' : 'neutral'}>workspace</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                notificações e rotinas em canais conectados
              </p>
            </div>
            <div className="app-surface rounded-[20px] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                Discord
              </p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-extrabold tracking-[-0.04em] text-[color:var(--text-strong)]">
                  {discordCount}
                </p>
                <Badge tone={discordCount > 0 ? 'success' : 'neutral'}>servidor</Badge>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                bots e comunidades prontas para acionar fluxos
              </p>
            </div>
          </div>
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
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]">
              Hub de integrações
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Escolha o canal que melhor acompanha sua rotina de notificações, alertas e respostas automatizadas.
            </p>
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare size={22} />
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">Slack</h3>
                <Badge tone={slackCount > 0 ? 'success' : 'neutral'}>
                  {slackCount > 0 ? `${slackCount} conectados` : 'Sem conexão'}
                </Badge>
              </div>
              <p className="mt-1 text-[color:var(--text-secondary)]">
                Conecte seu workspace para enviar mensagens automatizadas.
              </p>
            </div>
            <Button onClick={() => setShowSlackModal(true)} variant={slackIntegrations.length === 0 ? 'primary' : 'outline'}>
              {slackIntegrations.length === 0 ? 'Conectar Slack' : 'Adicionar workspace'}
            </Button>
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Gamepad2 size={22} />
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">Discord</h3>
                <Badge tone={discordCount > 0 ? 'success' : 'neutral'}>
                  {discordCount > 0 ? `${discordCount} conectados` : 'Sem conexão'}
                </Badge>
              </div>
              <p className="mt-1 text-[color:var(--text-secondary)]">
                Conecte seu servidor para acionar bots e canais automaticamente.
              </p>
            </div>
            <Button onClick={() => setShowDiscordModal(true)} variant={discordIntegrations.length === 0 ? 'primary' : 'outline'}>
              {discordIntegrations.length === 0 ? 'Conectar Discord' : 'Adicionar servidor'}
            </Button>
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

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="app-note-card flex gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
          <div>
            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">Como usar</h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Conecte o canal, revise a origem cadastrada e use suas automações para distribuir mensagens, avisos e rotinas sem sair do workspace.
            </p>
          </div>
        </div>
        <div className="app-note-card flex gap-3">
          <ArrowUpRight className="mt-0.5 h-5 w-5 text-[color:var(--text-accent)]" />
          <div>
            <h3 className="mb-2 font-semibold text-[color:var(--text-strong)]">
              Próximo passo
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Depois da conexão, direcione suas mensagens para canais específicos e mantenha a governança do que entra em Slack ou Discord.
            </p>
          </div>
        </div>
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
