import type { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react';

interface WebhookRow {
  id: string;
  url: string;
  description?: string;
  enabled: boolean;
}

type HealthState = 'ok' | 'error';

interface LocalWebhooksPageProps {
  backendBase: string;
  initialHealth: HealthState;
  initialHealthError: string | null;
}

const fallbackWebhooks: WebhookRow[] = [
  {
    id: 'local-sample-1',
    url: 'http://127.0.0.1:3001/api/webhooks/local-sample',
    description: 'Sample local webhook for dashboard smoke',
    enabled: true,
  },
];

const DEFAULT_BACKEND_BASE = 'http://127.0.0.1:3001';

async function checkBackendHealth(backendBase: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${backendBase}/health`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        initialHealth: 'error' as const,
        initialHealthError: `Backend retornou HTTP ${response.status} em ${backendBase}.`,
      };
    }

    return {
      initialHealth: 'ok' as const,
      initialHealthError: null,
    };
  } catch (error) {
    return {
      initialHealth: 'error' as const,
      initialHealthError: `Backend indisponível em ${backendBase}. Verifique: npm run dev:backend`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const getServerSideProps: GetServerSideProps<
  LocalWebhooksPageProps
> = async () => {
  const backendBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BACKEND_BASE;

  const health = await checkBackendHealth(backendBase);

  return {
    props: {
      backendBase,
      ...health,
    },
  };
};

export default function LocalWebhooksPage({
  backendBase,
  initialHealth,
  initialHealthError,
}: LocalWebhooksPageProps) {
  const [health, setHealth] = useState<HealthState>(initialHealth);
  const [healthError, setHealthError] = useState<string | null>(
    initialHealthError
  );
  const [webhooks, setWebhooks] = useState<WebhookRow[]>(fallbackWebhooks);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('devToken');
    const tokenFromStorage = window.localStorage.getItem('synkra_dev_token');
    const token = tokenFromUrl || tokenFromStorage || '';

    if (!token) {
      return;
    }

    setDevToken(token);
    setTokenInput(token);
    window.localStorage.setItem('synkra_dev_token', token);
  }, []);

  useEffect(() => {
    const run = async () => {
      const nextHealth = await checkBackendHealth(backendBase);
      setHealth(nextHealth.initialHealth);
      setHealthError(nextHealth.initialHealthError);

      if (!devToken) {
        setFlowError(
          'Sem token de teste. Exibindo fallback local. Cole um token JWT abaixo para listar webhooks reais.'
        );
        setWebhooks(fallbackWebhooks);
        return;
      }

      try {
        const response = await fetch(`${backendBase}/api/webhooks`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${devToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = (await response.json()) as WebhookRow[];

        if (Array.isArray(result) && result.length > 0) {
          setFlowError(null);
          setWebhooks(result);
        } else {
          setFlowError(
            'Token válido, mas nenhum webhook encontrado para este usuário. Exibindo fallback local.'
          );
          setWebhooks(fallbackWebhooks);
        }
      } catch (error) {
        setFlowError(
          'Não foi possível listar webhooks reais com o token informado. Verifique se o token está correto. Exibindo fallback local.'
        );
        setWebhooks(fallbackWebhooks);
      }
    };

    void run();
  }, [backendBase, devToken]);

  const applyToken = () => {
    const token = tokenInput.trim();
    setDevToken(token);

    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem('synkra_dev_token', token);
      } else {
        window.localStorage.removeItem('synkra_dev_token');
      }
    }
  };

  const clearToken = () => {
    setTokenInput('');
    setDevToken('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('synkra_dev_token');
    }
  };

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Webhooks - Fluxo Crítico Local</h1>
      <p>
        Esta página valida boot local do dashboard e renderização do fluxo de
        Webhooks com dados locais.
      </p>

      <section style={{ marginTop: 16 }}>
        <h2>Backend Health</h2>
        {health === 'ok' && <p style={{ color: '#0a7f24' }}>OK</p>}
        {health === 'error' && (
          <p style={{ color: '#b42318' }}>
            {healthError || 'Falha ao validar health do backend.'}
          </p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Token de Teste (Opcional)</h2>
        <p>
          Cole um JWT local para listar webhooks reais do usuário. Sem token,
          a página usa fallback local.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="text"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Cole aqui o token JWT de teste"
            style={{
              flex: '1 1 600px',
              minWidth: 300,
              padding: '8px 10px',
            }}
          />
          <button type="button" onClick={applyToken}>
            Aplicar token
          </button>
          <button type="button" onClick={clearToken}>
            Limpar token
          </button>
        </div>

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
