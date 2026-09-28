import { createContext, useContext, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

/**
 * App-wide notification state, backed by the WebSocket hook.
 * Wraps the whole authenticated app so the navbar bell (always visible)
 * and the Notifications page (Step 12, section 13) share one connection
 * and one unread count instead of each opening their own socket.
 */
export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const {
    unreadCount,
    latestNotification,
    connectionStatus,
    decrementUnreadCount,
    resetUnreadCount,
  } = useNotificationSocket(isAuthenticated);

  // Surface new notifications as a toast too, so they're noticeable even
  // if the user isn't looking at the bell right now.
  useEffect(() => {
    if (latestNotification) {
      toast.info(`🔔 ${latestNotification.title}: ${latestNotification.message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestNotification]);

  const value = {
    unreadCount,
    latestNotification,
    connectionStatus,
    decrementUnreadCount,
    resetUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside a <NotificationProvider>.');
  }
  return context;
};