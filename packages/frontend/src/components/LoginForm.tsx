import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';
import { loginSchema, type LoginFormData } from '@/schemas';

interface LoginFormProps {
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const responseData = await response.json();
        const errorMessage = responseData.error || 'Falha ao entrar';
        setFormError('root', { message: errorMessage });
        onError?.(errorMessage);
        return;
      }

      const responseData = await response.json();
      onSuccess?.(responseData.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao autenticar';
      setFormError('root', { message });
      onError?.(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">Entrar</h2>
        <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
          Use seu e-mail e senha para abrir o painel central da operação.
        </p>
      </div>

      <FormInput
        type="email"
        label="E-mail"
        placeholder="seu@email.com"
        required
        error={errors.email?.message}
        {...register('email')}
      />

      <FormInput
        type="password"
        label="Senha"
        placeholder="Sua senha"
        required
        error={errors.password?.message}
        {...register('password')}
      />

      {errors.root && (
        <div className="app-inline-banner app-inline-banner-error" role="alert">
          <strong>Acesso</strong>
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
        variant="primary"
      >
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>

      <div className="mt-4 text-center">
        <Link
          href="/auth/forgot-password"
          className="app-link block text-sm"
        >
          Esqueci minha senha
        </Link>
        <Link
          href="/auth/signup"
          className="app-link mt-3 block text-sm"
        >
          Não tem uma conta? Criar conta
        </Link>
      </div>
    </form>
  );
}
