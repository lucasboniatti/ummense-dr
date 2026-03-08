import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { integrationService } from '../services/integration.service';

interface SlackConnectModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Legacy props kept for compatibility with existing pages
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  onConnect?: (token: string) => void;
}

export function SlackConnectModal({
  open,
  onOpenChange,
  isOpen,
  onClose,
}: SlackConnectModalProps) {
  const resolvedOpen = open ?? isOpen ?? false;
  const close = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await integrationService.getSlackAuthUrl();

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          'integration_oauth_pending',
          JSON.stringify({
            provider: 'slack',
            state: response.state,
            code_verifier: response.code_verifier,
          })
        );

        window.location.assign(response.auth_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Slack OAuth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={(next) => (next ? onOpenChange?.(next) : close())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Slack</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <p className="text-sm text-neutral-600">
            Você será redirecionado para o Slack para autorizar a integração com PKCE.
          </p>
          {error && <p className="text-sm text-error-600">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConnect} disabled={loading}>
            {loading ? 'Redirecting...' : 'Continue with Slack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
