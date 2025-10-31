/**
 * React Hook for WebSocket
 * Provides easy integration of WebSocket events in React components
 */

import { useEffect } from 'react';
import { websocketService } from '../services/websocketService';
import { useAuthStoreV2 } from './useAuthStore-v2';

type WebSocketEvent = 'meeting-started' | 'meeting-ended' | 'participant-joined' | 'participant-left' | 'court-card-updated' | 'attendance-updated';

/**
 * Hook to automatically connect/disconnect WebSocket based on auth state
 */
export function useWebSocketConnection() {
  const { token, isAuthenticated } = useAuthStoreV2();

  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('🔌 Connecting WebSocket...');
      websocketService.connect(token);
    }

    return () => {
      if (isAuthenticated) {
        console.log('🔌 Disconnecting WebSocket...');
        websocketService.disconnect();
      }
    };
  }, [isAuthenticated, token]);
}

/**
 * Hook to subscribe to specific WebSocket events
 */
export function useWebSocketEvent(
  event: WebSocketEvent,
  callback: (data: any) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    console.log(`📡 Subscribing to WebSocket event: ${event}`);
    const unsubscribe = websocketService.on(event, callback);

    return () => {
      console.log(`📡 Unsubscribing from WebSocket event: ${event}`);
      unsubscribe();
    };
  }, [event, callback, enabled]);
}

/**
 * Hook to subscribe to multiple WebSocket events
 */
export function useWebSocketEvents(
  events: Array<{ event: WebSocketEvent; callback: (data: any) => void }>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const unsubscribers = events.map(({ event, callback }) => {
      console.log(`📡 Subscribing to WebSocket event: ${event}`);
      return websocketService.on(event, callback);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [events, enabled]);
}

/**
 * Get WebSocket connection status
 */
export function useWebSocketStatus() {
  return {
    isConnected: websocketService.isConnected(),
  };
}

