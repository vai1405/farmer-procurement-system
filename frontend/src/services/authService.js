import api from './api';

/**
 * All authentication API calls live here.
 * Components never call axios directly — they call these functions.
 */
export const authService = {
  register: async (payload) => {
    const { data } = await api.post('/auth/register/', payload);
    return data.data; // { user, tokens }
  },

  login: async ({ identifier, password }) => {
    const { data } = await api.post('/auth/login/', { identifier, password });
    return data.data;
  },

  staffLogin: async ({ identifier, password }) => {
    const { data } = await api.post('/auth/staff-login/', { identifier, password });
    return data.data;
  },

  getCurrentUser: async () => {
    const { data } = await api.get('/auth/me/');
    return data.data;
  },

  logout: async (refreshToken) => {
    const { data } = await api.post('/auth/logout/', { refresh: refreshToken });
    return data;
  },
};