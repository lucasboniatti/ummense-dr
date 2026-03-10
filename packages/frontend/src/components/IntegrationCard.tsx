import React from 'react';
import { ArrowUpRight, Gamepad2, MessageSquare } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { integrationService } from '../services/integration.service';

interface IntegrationCardProps {
  name?: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'connected' | 'disconnected';
  integration?: {
    id: string;
    enabled?: boolean;
    workspace_id?: string;
    workspace_name?: string;
    guild_id?: string;
    guild_name?: string;
  };
  type?: 'slack' | 'discord' | string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function IntegrationCard({
  name,
  description,
  icon,
  status,
  integration,
  type,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const [loading, setLoading] = React.useState(false);
  const resolvedName =
    name ||
    integration?.workspace_name ||
    integration?.guild_name ||
    (type ? `${type.toUpperCase()} Integration` : 'Integration');

  const resolvedDescription =
    description ||
    (integration?.enabled ? 'Integração conectada e ativa' : 'Integração ainda não conectada');

  const resolvedIcon =
    icon ||
    (type === 'discord'
      ? <Gamepad2 className="h-5 w-5" />
      : <MessageSquare className="h-5 w-5" />);
  const resolvedStatus =
    status || (integration?.enabled ? 'connected' : 'disconnected');
  const channelLabel = type === 'discord' ? 'Servidor' : 'Workspace';
  const rawIdentifier = integration?.workspace_id || integration?.guild_id || integration?.id || '';
  const identifier = rawIdentifier ? `${rawIdentifier.slice(0, 6)}...${rawIdentifier.slice(-4)}` : 'Não informado';
  const isConnected = resolvedStatus === 'connected';

  const handleDisconnect = async () => {
    if (!integration) {
      return;
    }

    setLoading(true);
    try {
      if (type === 'discord') {
        await integrationService.disconnectDiscord(integration.guild_id || integration.id);
      } else {
        await integrationService.disconnectSlack(integration.workspace_id || integration.id);
      }

      onDisconnect?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="group h-full border border-[color:var(--border-default)] bg-[color:var(--surface-card)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-accent)] hover:shadow-[var(--shadow-primary-day)]">
      <CardHeader className="space-y-4 border-b border-[color:var(--border-default)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{type === 'discord' ? 'Discord' : 'Slack'}</Badge>
              <Badge tone={isConnected ? 'success' : 'neutral'}>
                {isConnected ? 'Conectada' : 'Não conectada'}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <p className="app-kicker">{channelLabel} pronto para automações</p>
              <CardTitle className="text-xl">{resolvedName}</CardTitle>
            </div>
          </div>
          <div className="app-icon-tile h-12 w-12 shrink-0 rounded-2xl text-[color:var(--text-accent)]">
            {resolvedIcon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-5">
        <p className="text-sm leading-6 text-[color:var(--text-secondary)]">{resolvedDescription}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              Origem
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">
              {channelLabel}
            </p>
          </div>
          <div className="rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-muted)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              Identificador
            </p>
            <p className="mt-1 font-mono text-xs text-[color:var(--text-secondary)]">{identifier}</p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-[20px] border border-[color:var(--border-default)] bg-[color:var(--surface-raised)]/80 px-4 py-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
              Prontidão operacional
            </p>
            <p className="text-sm font-medium text-[color:var(--text-secondary)]">
              {isConnected
                ? 'Mensagens e gatilhos já podem usar este canal.'
                : 'Conecte este canal para liberar automações e alertas.'}
            </p>
          </div>
          {isConnected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={loading}>
              {loading ? 'Desconectando...' : 'Desconectar'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onConnect} className="gap-1.5">
              Conectar
              <ArrowUpRight size={14} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
