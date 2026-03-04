import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { integrationService } from '../../services/integration.service';

export default function IntegrationCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const { code, state, error: oauthError } = router.query;

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

        // Determine which integration type from the state or referrer
        const integrationType = state?.toString().startsWith('slack') ? 'slack' : 'discord';

        if (integrationType === 'slack') {
          await integrationService.handleSlackCallback({
            code: code.toString(),
            state: state.toString(),
          });
          setStatus('success');
          setMessage('Slack conectado com sucesso!');
        } else {
          await integrationService.handleDiscordCallback({
            code: code.toString(),
            state: state.toString(),
          });
          setStatus('success');
          setMessage('Discord conectado com sucesso!');
        }

        // Redirect back to integrations page after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/integrations');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Erro ao processar autenticação');
      }
    };

    if (router.isReady) {
      processCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold mb-2">Processando...</h1>
            <p className="text-neutral-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2 text-success-600">Sucesso!</h1>
            <p className="text-neutral-600 mb-4">{message}</p>
            <p className="text-sm text-neutral-500">Redirecionando para integrações...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2 text-error-600">Erro</h1>
            <p className="text-neutral-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard/integrations')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors w-full"
            >
              Voltar para Integrações
            </button>
          </>
        )}
      </div>
    </div>
  );
}
