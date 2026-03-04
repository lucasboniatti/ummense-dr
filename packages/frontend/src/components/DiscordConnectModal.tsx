import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/Dialog';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';

interface DiscordConnectModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Legacy props kept for compatibility with existing pages
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  onConnect?: (token: string) => void;
}

export function DiscordConnectModal({
  open,
  onOpenChange,
  isOpen,
  onClose,
  onSuccess,
  onConnect,
}: DiscordConnectModalProps) {
  const resolvedOpen = open ?? isOpen ?? false;
  const close = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!token.trim()) {
      setError('Token is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/integrations/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect Discord');
      }

      onConnect?.(token);
      onSuccess?.();
      setToken('');
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={(next) => (next ? onOpenChange?.(next) : close())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Discord</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <p className="text-sm text-neutral-600">
            Enter your Discord Bot Token for notifications.
          </p>

          <FormInput
            label="Bot Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="MTA4NzY..."
            error={error}
          />
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConnect} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
