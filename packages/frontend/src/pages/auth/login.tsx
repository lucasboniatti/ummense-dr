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
          <h1>Tasks Flow</h1>
          <p>Entre no workspace e gerencie suas tarefas com eficiência.</p>
        </div>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default LoginPage;
