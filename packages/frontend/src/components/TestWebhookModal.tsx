import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';

interface TestWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookUrl: string;
  onTest?: () => void;
}

export function TestWebhookModal({ open, onOpenChange, webhookUrl, onTest }: TestWebhookModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      setResult(await response.json());
      onTest?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Test Webhook</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <p className="text-sm text-neutral-600">
            URL: <span className="font-mono text-xs">{webhookUrl}</span>
          </p>

          {result && (
            <div className={`p-3 rounded-md text-sm ${result.success ? 'bg-success-100 text-success-900' : 'bg-error-100 text-error-900'}`}>
              {result.message}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
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
