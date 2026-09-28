import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { setAuthFailureHandler } from '../services/api';
import { tokenStorage } from '../utils/tokenStorage';

export const AuthContext = createContext(null);

/**
 * Holds the authenticated user in React state and exposes login/logout.
 *
 * Design note: we store only TOKENS in localStorage, never the user object.
 * On page reload we re-fetch the user from /auth/me/, so the UI can never
 * display stale role information (which would be a security smell).
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Restore the session on first mount (and after a hard refresh).
  useEffect(() => {
    const restoreSession = async () => {
      if (!tokenStorage.getAccessToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    // Let the Axios interceptor log us out if a refresh ultimately fails.
    setAuthFailureHandler(clearSession);
    restoreSession();
  }, [clearSession]);

  const login = useCallback(async (credentials, { staffPortal = false } = {}) => {
    const result = staffPortal
      ? await authService.staffLogin(credentials)
      : await authService.login(credentials);

    tokenStorage.setTokens(result.tokens);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authService.register(payload);
    tokenStorage.setTokens(result.tokens);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } catch {
      // Even if the server call fails, clear local state — the user
      // asked to log out and the UI must honour that.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      setUser,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};