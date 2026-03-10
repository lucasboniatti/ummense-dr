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
          <h1>Tasks Flow</h1>
          <p>Crie seu acesso e comece a gerenciar suas tarefas com eficiência.</p>
        </div>
        <SignupForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default SignupPage;
