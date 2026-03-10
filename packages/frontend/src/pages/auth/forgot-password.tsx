import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from '../../components/composite/FormField';
import { Button } from '../../components/ui/Button';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/schemas';

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const response = await fetch('/api/auth/password/reset-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));
        setError('root', {
          message: responseData.error || 'Falha ao solicitar redefinição de senha',
        });
        return;
      }

      reset();
      setSubmitted(true);
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao solicitar redefinição',
      });
    }
  };

  return (
    <div className="app-auth-shell">
      <div className="app-auth-card animate-fade-up">
        <div className="app-auth-brand">
          <span className="app-kicker">Tasks Flow</span>
          <h1>Recupere seu acesso.</h1>
          <p>Solicite um novo link para voltar ao painel sem perder o ritmo da operação.</p>
          <div className="app-auth-meta">
            <span className="app-auth-pill">Reset seguro</span>
            <span className="app-auth-pill">Fluxo assistido</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">
              Redefinir senha
            </h2>
            <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
          </div>

          {submitted && (
            <div className="app-inline-banner app-inline-banner-success" role="status">
              <strong>Verifique seu e-mail</strong>
              Se a conta existir, o link de redefinição já foi enviado.
            </div>
          )}

          <FormInput
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          {errors.root && (
            <div className="app-inline-banner app-inline-banner-error" role="alert">
              <strong>Recuperação</strong>
              {errors.root.message}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full" variant="primary">
            {isSubmitting ? 'Enviando...' : 'Enviar link de redefinição'}
          </Button>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="app-link text-sm"
            >
              Voltar para login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
