import api from './api';

/**
 * Farmer profile and dashboard API calls.
 */
export const farmerService = {
  getProfile: async () => {
    const { data } = await api.get('/farmers/profile/');
    return data.data;
  },

  updateProfile: async (payload) => {
    const { data } = await api.put('/farmers/profile/', payload);
    return data.data;
  },

  getDashboard: async () => {
    const { data } = await api.get('/farmers/dashboard/');
    return data.data;
  },
};