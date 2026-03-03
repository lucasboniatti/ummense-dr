'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface WebSocketContextType {
  isConnected: boolean;
  metrics: any;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

/**
 * WebSocket Hook for Real-Time Updates
 *
 * Manages WebSocket connection to execution-updates channel
 * with exponential backoff reconnection (3s, 6s, 12s, max 60s)
 *
 * Usage:
 * const { isConnected, subscribe, unsubscribe } = useWebSocket();
 */
export function useWebSocket(): WebSocketContextType {
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(3000); // Start with 3s
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  // Get WebSocket URL from environment or default
  const wsUrl = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : 'ws://localhost:9001';

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(`${wsUrl}/ws`);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectDelayRef.current = 3000; // Reset backoff on successful connection

        // Re-subscribe to all channels
        subscribedChannelsRef.current.forEach((channel) => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message:', data);

          // Emit custom event for components to listen
          window.dispatchEvent(
            new CustomEvent('websocket:execution-update', { detail: data })
          );

          if (data.type === 'execution-update') {
            setMetrics(data.data);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Exponential backoff reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 60000);
          console.log(`[WebSocket] Reconnecting in ${reconnectDelayRef.current}ms...`);
          connect();
        }, reconnectDelayRef.current);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
      setIsConnected(false);
    }
  }, [wsUrl]);

  const subscribe = useCallback(
    (channel: string) => {
      subscribedChannelsRef.current.add(channel);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
      } else {
        connect();
      }
    },
    [connect]
  );

  const unsubscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.delete(channel);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }, []);

  // Initial connection on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    metrics,
    subscribe,
    unsubscribe,
  };
}

/**
 * Alternative: WebSocket Context for global access
 *
 * Usage:
 * <WebSocketProvider>
 *   <Dashboard />
 * </WebSocketProvider>
 */
import React from 'react';

export const WebSocketContext = React.createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const ws = useWebSocket();

  return (
    <WebSocketContext.Provider value={ws}>{children}</WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = React.useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};
