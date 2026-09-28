import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

/**
 * Central Axios instance.
 *
 * Two interceptors do the heavy lifting:
 *  1. Request  - attaches the access token to every call.
 *  2. Response - on a 401, transparently refreshes the token once and
 *                retries the original request. Concurrent failed requests
 *                queue up behind a single refresh call instead of each
 *                firing their own.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor -------------------------------------------------
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor ------------------------------------------------
let isRefreshing = false;
let pendingRequests = [];

// Called once a refresh finishes, to release everything that was waiting.
const resolvePending = (newToken) => {
  pendingRequests.forEach((callback) => callback(newToken));
  pendingRequests = [];
};

// Allows AuthContext to react to an unrecoverable auth failure.
let onAuthFailure = null;
export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Endpoints that must never trigger a refresh loop.
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/staff-login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register');

    if (status !== 401 || originalRequest._retried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      if (onAuthFailure) onAuthFailure();
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    // A refresh is already running — wait for it rather than starting another.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((newToken) => {
          if (!newToken) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      // Use a bare axios call so this request skips the interceptors.
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh/`,
        { refresh: refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      const newTokens = data.data.tokens;
      tokenStorage.setTokens(newTokens);

      resolvePending(newTokens.access);
      originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;

      return api(originalRequest);
    } catch (refreshError) {
      resolvePending(null);
      tokenStorage.clear();
      if (onAuthFailure) onAuthFailure();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/**
 * Extract a user-friendly message from any Axios error.
 * Our backend always returns { success, message }, so we prefer that.
 */
export const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  'Something went wrong. Please try again.';

export default api;