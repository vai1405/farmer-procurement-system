import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Convenience hook so components can write:
 *   const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }

  return context;
};