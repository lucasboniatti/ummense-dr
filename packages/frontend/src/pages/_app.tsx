import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import AppShell from '../components/layout/AppShell';
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
    return <Component {...pageProps} />;
  }

  return (
    <AppShell>
      <Component {...pageProps} />
    </AppShell>
  );
}
