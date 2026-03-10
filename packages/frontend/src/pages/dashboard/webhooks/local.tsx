import type { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleX } from 'lucide-react';

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
    const tokenFromStorage = window.localStorage.getItem('tasksflow_dev_token');
    const token = tokenFromUrl || tokenFromStorage || '';

    if (!token) {
      return;
    }

    setDevToken(token);
    setTokenInput(token);
    window.localStorage.setItem('tasksflow_dev_token', token);
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
        window.localStorage.setItem('tasksflow_dev_token', token);
      } else {
        window.localStorage.removeItem('tasksflow_dev_token');
      }
    }
  };

  const clearToken = () => {
    setTokenInput('');
    setDevToken('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('tasksflow_dev_token');
    }
  };

  return (
    <main className="app-page">
      <section className="app-page-hero animate-fade-up">
        <div className="app-page-heading">
          <p className="app-kicker">Webhooks</p>
          <h1 className="app-page-title">Fluxo critico local</h1>
          <p className="app-page-copy">
          Esta página valida boot local do dashboard e renderização do fluxo de
          Webhooks com dados locais.
        </p>
        </div>
      </section>

      <section className="app-section-card space-y-2">
        <h2 className="app-section-title">Saude do backend</h2>
        {health === 'ok' && (
          <p className="inline-flex items-center gap-2 text-success-700 font-semibold">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            OK
          </p>
        )}
        {health === 'error' && (
          <p className="inline-flex items-center gap-2 text-error-700 font-semibold">
            <CircleX className="h-4 w-4" aria-hidden="true" />
            {healthError || 'Falha ao validar health do backend.'}
          </p>
        )}
      </section>

      <section className="app-surface space-y-4 p-5">
        <div>
          <h2 className="app-section-title">Token de teste</h2>
          <p className="text-neutral-700 text-sm">
            Cole um JWT local para listar webhooks reais do usuário. Sem token,
            a página usa fallback local.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Cole aqui o token JWT de teste"
            className="app-control h-11 min-w-[300px] flex-1 rounded-[var(--radius-control)] px-3 text-sm"
          />
          <button type="button" onClick={applyToken} className="app-control h-11 rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
            Aplicar token
          </button>
          <button type="button" onClick={clearToken} className="app-control h-11 rounded-[var(--radius-control)] px-4 text-sm font-semibold text-neutral-900">
            Limpar token
          </button>
        </div>

        <div>
          <h2 className="app-section-title mb-3 mt-4">Lista de webhooks</h2>
          {flowError && (
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-warning-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {flowError}
            </p>
          )}
          {webhooks.length === 0 ? (
            <p className="text-neutral-600">Nenhum webhook disponível.</p>
          ) : (
            <div className="app-table-shell">
              <table className="w-full">
                <thead className="bg-neutral-100 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">URL</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {webhooks.map((hook) => (
                    <tr key={hook.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm font-mono text-neutral-900">{hook.id}</td>
                      <td className="px-4 py-3 text-sm text-neutral-700">{hook.url}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center gap-1.5 ${hook.enabled ? 'text-success-700 font-semibold' : 'text-neutral-600'}`}
                        >
                          {hook.enabled && (
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          )}
                          {hook.enabled ? 'ativo' : 'inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
