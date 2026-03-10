import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle2, CircleX } from 'lucide-react';
import { integrationService } from '../../services/integration.service';

export default function IntegrationCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const { code, state, error: oauthError, provider } = router.query;

        if (oauthError) {
          setStatus('error');
          setMessage(`Erro de autenticação: ${oauthError}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Parâmetros de autenticação ausentes');
          return;
        }

        const pendingRaw =
          typeof window !== 'undefined'
            ? window.sessionStorage.getItem('integration_oauth_pending')
            : null;

        if (!pendingRaw) {
          setStatus('error');
          setMessage('Fluxo OAuth expirado ou inexistente');
          return;
        }

        const pending = JSON.parse(pendingRaw) as {
          provider: 'slack' | 'discord';
          state: string;
          code_verifier: string;
        };

        const integrationType =
          provider === 'slack' || provider === 'discord'
            ? provider
            : pending.provider;

        if (pending.state !== state.toString()) {
          setStatus('error');
          setMessage('Estado OAuth inválido. Tente conectar novamente.');
          return;
        }

        if (integrationType === 'slack') {
          await integrationService.handleSlackCallback({
            code: code.toString(),
            state: state.toString(),
            code_verifier: pending.code_verifier,
          });
          setStatus('success');
          setMessage('Slack conectado com sucesso!');
        } else {
          await integrationService.handleDiscordCallback({
            code: code.toString(),
            state: state.toString(),
            code_verifier: pending.code_verifier,
          });
          setStatus('success');
          setMessage('Discord conectado com sucesso!');
        }

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('integration_oauth_pending');
        }

        // Redirect back to integrations page after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/integrations');
        }, 2000);
      } catch (err) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('integration_oauth_pending');
        }
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Erro ao processar autenticação');
      }
    };

    if (router.isReady) {
      processCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="app-auth-shell">
      <div className="app-auth-card w-full max-w-md text-center animate-fade-up">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-500"></div>
            <p className="app-kicker">Integracao</p>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-neutral-900">Processando...</h1>
            <p className="mt-2 text-neutral-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-700">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="app-kicker">Integracao</p>
            <h1 className="mb-2 mt-2 text-2xl font-bold tracking-[-0.03em] text-success-600">Sucesso</h1>
            <p className="mb-4 text-neutral-600">{message}</p>
            <p className="text-sm text-neutral-500">Redirecionando para integrações...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-100 text-error-700">
              <CircleX className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="app-kicker">Integracao</p>
            <h1 className="mb-2 mt-2 text-2xl font-bold tracking-[-0.03em] text-error-600">Erro</h1>
            <p className="mb-6 text-neutral-600">{message}</p>
            <button
              onClick={() => router.push('/dashboard/integrations')}
              className="app-control h-11 w-full rounded-[var(--radius-control)] border-transparent bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Voltar para Integrações
            </button>
          </>
        )}
      </div>
    </div>
  );
}
