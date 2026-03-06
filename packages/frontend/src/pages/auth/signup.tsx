import React from 'react';
import { SignupForm } from '../../components/SignupForm';

export function SignupPage() {
  const handleSuccess = (token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('synkra_dev_token', token);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <SignupForm onSuccess={handleSuccess} />
    </div>
  );
}

export default SignupPage;
