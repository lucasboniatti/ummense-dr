import React from 'react';
import { LoginForm } from '../../components/LoginForm';

export function LoginPage() {
  const handleSuccess = (token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('synkra_dev_token', token);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <LoginForm onSuccess={handleSuccess} />
    </div>
  );
}

export default LoginPage;
