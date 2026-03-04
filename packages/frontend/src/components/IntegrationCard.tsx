import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';
import { Button } from './ui/Button';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected';
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function IntegrationCard({
  name,
  description,
  icon,
  status,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg">{name}</CardTitle>
        <div className="text-2xl">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neutral-600">{description}</p>

        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              status === 'connected'
                ? 'bg-success-100 text-success-900'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {status === 'connected' ? '✓ Connected' : 'Not Connected'}
          </span>

          {status === 'connected' ? (
            <Button variant="outline" size="sm" onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onConnect}>
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
