import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';

interface TestWebhookModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  webhookUrl?: string;
  // Legacy props kept for compatibility with existing pages
  webhookId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
  onTest?: () => void;
}

export function TestWebhookModal({
  open,
  onOpenChange,
  webhookUrl,
  webhookId,
  onClose,
  onSuccess,
  onTest,
}: TestWebhookModalProps) {
  const resolvedOpen = open ?? true;
  const close = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setLoading(true);
    try {
      const response = webhookId
        ? await fetch(`/api/webhooks/${webhookId}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        : await fetch('/api/webhooks/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl }),
          });
      setResult(await response.json());
      onSuccess?.();
      onTest?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={(next) => (next ? onOpenChange?.(next) : close())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Test Webhook</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <p className="text-sm text-neutral-600">
            {webhookUrl ? (
              <>
                URL: <span className="font-mono text-xs">{webhookUrl}</span>
              </>
            ) : (
              <>
                Webhook ID: <span className="font-mono text-xs">{webhookId}</span>
              </>
            )}
          </p>

          {result && (
            <div className={`p-3 rounded-md text-sm ${result.success ? 'bg-success-100 text-success-900' : 'bg-error-100 text-error-900'}`}>
              {result.message}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Close
          </Button>
          <Button variant="primary" onClick={handleTest} disabled={loading}>
            {loading ? 'Testing...' : 'Send Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
