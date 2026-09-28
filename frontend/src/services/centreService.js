import api from './api';

/**
 * Procurement centre API calls.
 */
export const centreService = {
  list: async ({ q, isActive, page = 1, pageSize = 20 } = {}) => {
    const { data } = await api.get('/centres/', {
      params: {
        q: q || undefined,
        is_active: isActive === undefined ? undefined : isActive,
        page,
        page_size: pageSize,
      },
    });
    return data.data; // { centres, pagination }
  },

  listActive: async () => {
    const { data } = await api.get('/centres/active/');
    return data.data.centres;
  },

  get: async (id) => {
    const { data } = await api.get(`/centres/${id}/`);
    return data.data;
  },

  create: async (payload) => {
    const { data } = await api.post('/centres/', payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/centres/${id}/`, payload);
    return data.data;
  },

  setStatus: async (id, isActive) => {
    const { data } = await api.put(`/centres/${id}/status/`, { is_active: isActive });
    return data.data;
  },

  remove: async (id) => {
    const { data } = await api.delete(`/centres/${id}/`);
    return data;
  },
};