import { useEffect, useState } from 'react';

/**
 * Shows a persistent banner when the browser reports it has lost network
 * connectivity, and hides it automatically when connectivity returns.
 * Complements ConnectionStatus (Step 9), which tracks the WebSocket
 * specifically — this tracks the browser's actual network state.
 */
const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="bg-danger text-white text-center py-2 small fw-medium"
      style={{ position: 'sticky', top: 0, zIndex: 2000 }}
    >
      ⚠️ You are currently offline. Some features may not work until your connection is restored.
    </div>
  );
};

export default OfflineBanner;