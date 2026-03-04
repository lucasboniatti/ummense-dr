import { useEffect, useMemo, useState } from 'react';
import { webhookService } from '../../../services/webhook.service';

interface WebhookRow {
  id: string;
  url: string;
  description?: string;
  enabled: boolean;
}

const fallbackWebhooks: WebhookRow[] = [
  {
    id: 'local-sample-1',
    url: 'http://127.0.0.1:3001/api/webhooks/local-sample',
    description: 'Sample local webhook for dashboard smoke',
    enabled: true,
  },
];

export default function LocalWebhooksPage() {
  const [health, setHealth] = useState<'loading' | 'ok' | 'error'>('loading');
  const [healthError, setHealthError] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [flowError, setFlowError] = useState<string | null>(null);

  const backendBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001',
    []
  );

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(`${backendBase}/health`);
        if (!response.ok) {
          throw new Error(`Health returned HTTP ${response.status}`);
        }
        setHealth('ok');
      } catch (error) {
        setHealth('error');
        setHealthError(
          `Backend indisponível em ${backendBase}. Verifique: npm run dev:backend`
        );
      }

      try {
        const result = await webhookService.listWebhooks();
        if (Array.isArray(result) && result.length > 0) {
          setWebhooks(result as WebhookRow[]);
          return;
        }
        setWebhooks(fallbackWebhooks);
      } catch (error) {
        setFlowError(
          'Não foi possível listar webhooks reais (ex.: autenticação ausente). Exibindo dados locais de fallback para smoke/UAT.'
        );
        setWebhooks(fallbackWebhooks);
      }
    };

    void run();
  }, [backendBase]);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Webhooks - Fluxo Crítico Local</h1>
      <p>
        Esta página valida boot local do dashboard e renderização do fluxo de
        Webhooks com dados locais.
      </p>

      <section style={{ marginTop: 16 }}>
        <h2>Backend Health</h2>
        {health === 'loading' && <p>Validando health...</p>}
        {health === 'ok' && <p style={{ color: '#0a7f24' }}>OK</p>}
        {health === 'error' && (
          <p style={{ color: '#b42318' }}>
            {healthError || 'Falha ao validar health do backend.'}
          </p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Lista de Webhooks</h2>
        {flowError && <p style={{ color: '#b54708' }}>{flowError}</p>}
        {webhooks.length === 0 ? (
          <p>Nenhum webhook disponível.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 8,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  ID
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  URL
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((hook) => (
                <tr key={hook.id}>
                  <td style={{ padding: '8px 0' }}>{hook.id}</td>
                  <td style={{ padding: '8px 0' }}>{hook.url}</td>
                  <td style={{ padding: '8px 0' }}>
                    {hook.enabled ? 'enabled' : 'disabled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
