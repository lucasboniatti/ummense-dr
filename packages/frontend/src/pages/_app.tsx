import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import AppShell from '../components/layout/AppShell';
import { AuthProvider } from '../contexts/AuthContext';
import AuthGuard from '../components/guards/AuthGuard';
import { ErrorBoundary } from '../components/guards/ErrorBoundary';
import { ToastProvider } from '../contexts/ToastContext';
import { ToastContainer } from '../components/ui/ToastContainer';
import '../styles/globals.css';

function shouldUseShell(pathname: string): boolean {
  if (pathname.startsWith('/auth')) {
    return false;
  }

  return true;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  if (!shouldUseShell(router.pathname)) {
    return (
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AuthGuard>
            <AppShell>
              <Component {...pageProps} />
            </AppShell>
          </AuthGuard>
        </ErrorBoundary>
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  );
}
