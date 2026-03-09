import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for detecting online/offline status.
 * Useful for showing offline warnings and queueing mutations.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for offline-aware mutations.
 * Queues mutations when offline and processes them when back online.
 */
export function useOfflineQueue<T extends (...args: any[]) => Promise<any>>(
  mutationFn: T,
  options?: {
    onQueued?: () => void;
    onProcessed?: (result: Awaited<ReturnType<T>>) => void;
    onFailed?: (error: Error) => void;
  }
) {
  const isOnline = useNetworkStatus();
  const [queue, setQueue] = useState<(() => Promise<void>)[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isProcessing) {
      const processQueue = async () => {
        setIsProcessing(true);
        for (const item of queue) {
          try {
            await item();
          } catch (error) {
            console.error('[OfflineQueue] Failed to process queued item:', error);
          }
        }
        setQueue([]);
        setIsProcessing(false);
      };
      processQueue();
    }
  }, [isOnline, queue, isProcessing]);

  const queuedMutation = useCallback(
    async (...args: Parameters<T>) => {
      if (isOnline) {
        return mutationFn(...args);
      }

      // Queue for later
      options?.onQueued?.();

      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        const queuedFn = async () => {
          try {
            const result = await mutationFn(...args);
            options?.onProcessed?.(result);
            resolve(result);
          } catch (error) {
            options?.onFailed?.(error as Error);
            reject(error);
          }
        };

        setQueue((prev) => [...prev, queuedFn]);
      });
    },
    [mutationFn, isOnline, options]
  );

  return {
    mutation: queuedMutation,
    isOnline,
    pendingCount: queue.length,
    isProcessing,
  };
}