import React from 'react';
import { SignupForm } from '../../components/SignupForm';

export function SignupPage() {
  const handleSuccess = (token: string) => {
    // Store token and redirect
    localStorage.setItem('token', token);
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <SignupForm onSuccess={handleSuccess} />
    </div>
  );
}

export default SignupPage;
