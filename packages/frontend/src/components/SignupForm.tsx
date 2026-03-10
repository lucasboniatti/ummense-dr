import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';
import { signupSchema, type SignupFormData } from '@/schemas';

interface SignupFormProps {
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
}

export function SignupForm({ onSuccess, onError }: SignupFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      if (!response.ok) {
        const responseData = await response.json();
        const errorMessage = responseData.error || 'Falha ao criar conta';
        setError('root', { message: errorMessage });
        onError?.(errorMessage);
        return;
      }

      const responseData = await response.json();
      onSuccess?.(responseData.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao criar conta';
      setError('root', { message });
      onError?.(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-[color:var(--text-strong)]">Criar conta</h2>
        <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
          Configure seus dados iniciais para entrar no workspace.
        </p>
      </div>

      <FormInput
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        required
        error={errors.email?.message}
        {...register('email')}
      />
      <FormInput
        label="Senha"
        type="password"
        placeholder="Crie uma senha segura"
        required
        error={errors.password?.message}
        {...register('password')}
      />
      <FormInput
        label="Confirmar senha"
        type="password"
        placeholder="Repita sua senha"
        required
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      {errors.root && (
        <div className="app-inline-banner app-inline-banner-error" role="alert">
          <strong>Cadastro</strong>
          {errors.root.message}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full" variant="primary">
        {isSubmitting ? 'Criando conta...' : 'Criar conta'}
      </Button>

      <div className="mt-4 text-center">
        <Link
          href="/auth/login"
          className="app-link text-sm"
        >
          Já tem uma conta? Entrar
        </Link>
      </div>
    </form>
  );
}
