import React from 'react';
import { LoginForm } from '../../components/LoginForm';

export function LoginPage() {
  const handleSuccess = (token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('synkra_dev_token', token);
    window.location.href = '/';
  };

  return (
    <div className="app-auth-shell">
      <div className="app-auth-card animate-fade-up">
        <div className="app-auth-brand">
          <h1>Synkra</h1>
          <p>Entre no workspace operacional com a mesma linguagem visual do restante do produto.</p>
        </div>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default LoginPage;
