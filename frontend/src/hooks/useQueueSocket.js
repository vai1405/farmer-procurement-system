import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../utils/tokenStorage';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

/**
 * Subscribes to live queue updates for one slot over a WebSocket.
 *
 * Handles:
 *   - building the authenticated ws:// URL
 *   - connect / disconnect lifecycle tied to the slotId changing
 *   - exponential-backoff reconnection if the connection drops
 *   - falling back gracefully (connectionStatus stays 'error') if the
 *     socket cannot connect at all, so callers can show a message
 *     instead of a silently frozen screen
 *
 * Usage:
 *   const { queueData, connectionStatus } = useQueueSocket(slotId);
 */
export const useQueueSocket = (slotId) => {
  const [queueData, setQueueData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  // idle | connecting | connected | disconnected | error

  const socketRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!slotId) return;

    const token = tokenStorage.getAccessToken();
    if (!token) {
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');

    const wsBase = import.meta.env.VITE_WS_URL; // e.g. ws://127.0.0.1:8000/ws
    const socket = new WebSocket(`${wsBase}/queue/${slotId}/?token=${token}`);
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnectionStatus('connected');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'queue.snapshot' || message.type === 'queue.update') {
          setQueueData(message.data);
        }
      } catch {
        // Ignore malformed frames rather than crashing the UI.
      }
    };

    socket.onclose = (event) => {
      if (isUnmountedRef.current) return;

      setConnectionStatus('disconnected');

      // 4401 = our custom "unauthenticated" close code — don't retry
      // endlessly with a token that will never become valid; the access
      // token likely expired. A fresh mount (e.g. after token refresh)
      // will reconnect naturally when the component re-renders.
      if (event.code === 4401) {
        setConnectionStatus('error');
        return;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, capped at 15s.
      const attempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = attempt;
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1),
        RECONNECT_MAX_DELAY_MS,
      );

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    socket.onerror = () => {
      // onclose fires right after onerror for WebSockets, so the retry
      // logic above will still run — this handler just avoids an
      // unhandled-error console warning.
    };
  }, [slotId]);

  useEffect(() => {
    isUnmountedRef.current = false;
    setQueueData(null);

    if (slotId) {
      connect();
    } else {
      setConnectionStatus('idle');
    }

    return () => {
      isUnmountedRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        // Prevent the onclose handler from scheduling a reconnect after
        // a deliberate unmount/slot change.
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [slotId, connect]);

  return { queueData, connectionStatus };
};