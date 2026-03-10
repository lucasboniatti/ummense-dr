import React from 'react';
import { SignupForm } from '../../components/SignupForm';

export function SignupPage() {
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
          <h1>Crie seu acesso.</h1>
          <p>Abra sua conta e comece a operar com um painel único para tarefas, webhooks e integrações.</p>
          <div className="app-auth-meta">
            <span className="app-auth-pill">Onboarding rápido</span>
            <span className="app-auth-pill">Fluxos prontos</span>
          </div>
        </div>
        <SignupForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default SignupPage;
