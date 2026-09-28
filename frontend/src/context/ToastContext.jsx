import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

/**
 * Lightweight toast system built on Bootstrap's toast markup.
 *
 * Usage anywhere in the app:
 *   const toast = useToast();
 *   toast.success('Slot booked successfully.');
 *   toast.error('This slot is already full.');
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'success', duration = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, variant }]);
      // Auto-dismiss so the user never has to clear them manually.
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'danger'),
      info: (message) => push(message, 'info'),
      warning: (message) => push(message, 'warning'),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container — fixed to the bottom-right on all screen sizes */}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1080 }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast show align-items-center text-bg-${toast.variant} border-0 mb-2`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body">{toast.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => dismiss(toast.id)}
                aria-label="Close"
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>.');
  }
  return context;
};