import React, { useState } from 'react';
import Link from 'next/link';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';

interface SignupFormProps {
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
}

export function SignupForm({ onSuccess, onError }: SignupFormProps) {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password, name: formData.name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Signup failed');
      }

      const data = await response.json();
      onSuccess?.(data.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Criar Conta</h2>

      <FormInput label="Nome" type="text" name="name" value={formData.name} onChange={handleChange} required />
      <FormInput label="E-mail" type="email" name="email" value={formData.email} onChange={handleChange} required />
      <FormInput label="Senha" type="password" name="password" value={formData.password} onChange={handleChange} required />
      <FormInput label="Confirmar Senha" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />

      {error && <div className="p-3 bg-error-100 border border-error-400 text-error-700 rounded-md text-sm">{error}</div>}

      <Button type="submit" disabled={loading} className="w-full" variant="primary">
        {loading ? 'Criando Conta...' : 'Criar Conta'}
      </Button>

      <div className="mt-4 text-center">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Já tem uma conta? Entrar
        </Link>
      </div>
    </form>
  );
}
