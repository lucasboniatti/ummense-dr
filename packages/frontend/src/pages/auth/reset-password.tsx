import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '../../components/composite/FormField';
import { Button } from '../../components/ui/Button';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/schemas';

function readRecoveryToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get('access_token') ||
    searchParams.get('access_token') ||
    ''
  );
}

function readRecoveryType(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  return hashParams.get('type') || searchParams.get('type') || '';
}

export function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    setAccessToken(readRecoveryToken());
  }, []);

  const recoveryType = useMemo(() => readRecoveryType(), []);
  const invalidRecoveryLink = !accessToken || (recoveryType && recoveryType !== 'recovery');

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          password: data.password,
        }),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          responseData.error ||
          (Array.isArray(responseData.errors)
            ? responseData.errors.join(', ')
            : 'Falha ao redefinir a senha');
        setError('root', { message });
        return;
      }

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/auth/reset-password');
      }

      setSuccessMessage('Senha atualizada com sucesso. Você já pode entrar com a nova senha.');
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao redefinir a senha',
      });
    }
  };

  return (
    <div className="app-auth-shell">
      <div className="app-auth-card animate-fade-up">
        <div className="app-auth-brand">
          <h1>Tasks Flow</h1>
          <p>Defina uma nova senha para recuperar o acesso à sua conta.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-neutral-900">
              Nova senha
            </h2>
            <p className="text-sm leading-6 text-neutral-500">
              Sua nova senha precisa ter pelo menos 8 caracteres, com letra e número.
            </p>
          </div>

          {successMessage && (
            <div className="app-inline-banner app-inline-banner-success" role="status">
              <strong>Senha atualizada</strong>
              {successMessage}
            </div>
          )}

          {invalidRecoveryLink && (
            <div className="app-inline-banner app-inline-banner-error" role="alert">
              <strong>Link inválido</strong>
              O link de redefinição está ausente ou expirou. Solicite um novo link.
            </div>
          )}

          {!successMessage && !invalidRecoveryLink && (
            <>
              <FormInput
                label="Nova senha"
                type="password"
                placeholder="Crie uma nova senha"
                required
                error={errors.password?.message}
                {...register('password')}
              />

              <FormInput
                label="Confirmar nova senha"
                type="password"
                placeholder="Repita sua nova senha"
                required
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </>
          )}

          {errors.root && (
            <div className="app-inline-banner app-inline-banner-error" role="alert">
              <strong>Redefinição</strong>
              {errors.root.message}
            </div>
          )}

          {!successMessage && !invalidRecoveryLink && (
            <Button type="submit" disabled={isSubmitting} className="w-full" variant="primary">
              {isSubmitting ? 'Atualizando...' : 'Salvar nova senha'}
            </Button>
          )}

          <div className="text-center">
            <Link
              href={invalidRecoveryLink ? '/auth/forgot-password' : '/auth/login'}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {invalidRecoveryLink ? 'Solicitar novo link' : 'Voltar para login'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
