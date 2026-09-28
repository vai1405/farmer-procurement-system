import { STORAGE_KEYS } from './constants';

/**
 * Thin wrapper around localStorage for auth tokens.
 * Keeping this in one file means we could swap to sessionStorage or
 * httpOnly cookies later by changing only this module.
 */
export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  getRefreshToken: () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),

  setTokens: ({ access, refresh }) => {
    if (access) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
    if (refresh) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};
