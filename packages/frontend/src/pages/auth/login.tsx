import React from 'react';
import { LoginForm } from '../../components/LoginForm';

export function LoginPage() {
  const handleSuccess = (token: string) => {
    // Store token and redirect
    localStorage.setItem('token', token);
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <LoginForm onSuccess={handleSuccess} />
    </div>
  );
}

export default LoginPage;
