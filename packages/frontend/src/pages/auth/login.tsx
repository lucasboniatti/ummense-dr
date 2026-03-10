import React from 'react';
import { LoginForm } from '../../components/LoginForm';

export function LoginPage() {
  const handleSuccess = (token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('tasksflow_dev_token', token);
    window.location.href = '/';
  };

  return (
    <div className="app-auth-shell">
      <div className="app-auth-card animate-fade-up">
        <div className="app-auth-brand">
          <span className="app-kicker">Tasks Flow</span>
          <h1>Entre no seu workspace.</h1>
          <p>Centralize rotinas, webhooks e automações com uma interface mais clara e vendável.</p>
          <div className="app-auth-meta">
            <span className="app-auth-pill">Operação central</span>
            <span className="app-auth-pill">UX tokenizada</span>
          </div>
        </div>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default LoginPage;
