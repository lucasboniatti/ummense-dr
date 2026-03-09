import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Button } from './ui/Button';
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
    (integration?.enabled ? 'Integracao conectada e ativa' : 'Integracao ainda nao conectada');

  const resolvedIcon = icon || (type === 'discord' ? '🎮' : '💬');
  const resolvedStatus =
    status || (integration?.enabled ? 'connected' : 'disconnected');

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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-2">
          <p className="app-kicker">{type === 'discord' ? 'Discord' : 'Slack'}</p>
          <CardTitle className="text-lg">{resolvedName}</CardTitle>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary-50 text-2xl">
          {resolvedIcon}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neutral-600">{resolvedDescription}</p>

        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              resolvedStatus === 'connected'
                ? 'bg-success-100 text-success-900'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {resolvedStatus === 'connected' ? 'Conectada' : 'Nao conectada'}
          </span>

          {resolvedStatus === 'connected' ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={loading}>
              {loading ? 'Desconectando...' : 'Desconectar'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onConnect}>
              Conectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
