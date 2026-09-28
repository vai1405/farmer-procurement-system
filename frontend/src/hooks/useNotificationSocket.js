import { useEffect, useRef, useState } from 'react';
import { tokenStorage } from '../utils/tokenStorage';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

/**
 * Subscribes to the authenticated user's personal notification channel.
 *
 * Mirrors useQueueSocket's connect/reconnect/cleanup pattern from Step 9,
 * but against the /ws/notifications/ endpoint and a per-user group
 * instead of a per-slot one.
 *
 * Usage:
 *   const { unreadCount, latestNotification, connectionStatus } =
 *     useNotificationSocket(isAuthenticated);
 */
export const useNotificationSocket = (enabled) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const socketRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;

    if (!enabled) {
      setConnectionStatus('idle');
      return undefined;
    }

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        setConnectionStatus('error');
        return;
      }

      setConnectionStatus('connecting');

      const wsBase = import.meta.env.VITE_WS_URL;
      const socket = new WebSocket(`${wsBase}/notifications/?token=${token}`);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setConnectionStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'notification.snapshot') {
            setUnreadCount(message.data.unread_count);
          }

          if (message.type === 'notification.new') {
            setLatestNotification(message.data);
            setUnreadCount((current) => current + 1);
          }
        } catch {
          // Ignore malformed frames.
        }
      };

      socket.onclose = (event) => {
        if (isUnmountedRef.current) return;
        setConnectionStatus('disconnected');

        if (event.code === 4401) {
          setConnectionStatus('error');
          return;
        }

        const attempt = reconnectAttemptRef.current + 1;
        reconnectAttemptRef.current = attempt;
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1),
          RECONNECT_MAX_DELAY_MS,
        );

        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {};
    };

    connect();

    return () => {
      isUnmountedRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [enabled]);

  // Lets the navbar reset the badge immediately after "mark all read"
  // without waiting for a server round-trip.
  const decrementUnreadCount = (by = 1) => {
    setUnreadCount((current) => Math.max(0, current - by));
  };

  const resetUnreadCount = () => setUnreadCount(0);

  return {
    unreadCount,
    latestNotification,
    connectionStatus,
    decrementUnreadCount,
    resetUnreadCount,
  };
};