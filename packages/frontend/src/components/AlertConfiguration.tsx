import React, { useState } from 'react';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/CardUI';

interface AlertConfigProps {
  onSave?: (config: any) => void;
}

export function AlertConfiguration({ onSave }: AlertConfigProps) {
  const [config, setConfig] = useState({ threshold: 80, email: '', slack: '' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormInput label="Threshold (%)" type="number" value={config.threshold} onChange={(e) => setConfig(prev => ({ ...prev, threshold: parseInt(e.target.value) }))} />
        <FormInput label="Email" type="email" value={config.email} onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))} />
        <FormInput label="Slack Webhook" type="url" value={config.slack} onChange={(e) => setConfig(prev => ({ ...prev, slack: e.target.value }))} />
        <Button onClick={() => onSave?.(config)} variant="primary">Save Configuration</Button>
      </CardContent>
    </Card>
  );
}
