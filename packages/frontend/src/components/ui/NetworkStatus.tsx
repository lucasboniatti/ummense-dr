import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 rounded-lg bg-warning-500 px-4 py-3 text-white shadow-lg md:left-auto"
    >
      <div className="flex items-center gap-3">
        <WifiOff className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Você está offline</p>
          <p className="text-sm opacity-90">
            Suas alterações serão sincronizadas quando a conexão retornar.
          </p>
        </div>
      </div>
    </div>
  );
}

export function NetworkStatusIndicator({ className = '' }: { className?: string }) {
  const isOnline = useNetworkStatus();

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
        isOnline
          ? 'bg-success-50 text-success-700'
          : 'bg-warning-50 text-warning-700'
      } ${className}`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}