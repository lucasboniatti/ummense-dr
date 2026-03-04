import React, { useState } from 'react';
import { FormInput } from './composite/FormField';
import { Button } from './ui/Button';

interface LoginFormProps {
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || 'Login failed';
        setError(errorMessage);
        onError?.(errorMessage);
        return;
      }

      const data = await response.json();
      onSuccess?.(data.token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Log In</h2>

      <FormInput
        type="email"
        label="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />

      <FormInput
        type="password"
        label="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Your password"
        required
      />

      {error && (
        <div className="p-3 bg-error-100 border border-error-400 text-error-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
        variant="primary"
      >
        {loading ? 'Loading...' : 'Log In'}
      </Button>
    </form>
  );
}
