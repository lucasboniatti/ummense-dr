import React from 'react';
import { LoginForm } from '../../components/LoginForm';

export function LoginPage() {
  const handleSuccess = (token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('synkra_dev_token', token);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">Synkra</h1>
          <p className="text-neutral-500 mt-2">Plataforma de Operações</p>
        </div>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default LoginPage;
