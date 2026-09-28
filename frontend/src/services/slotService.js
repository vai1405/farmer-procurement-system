import api from './api';

/**
 * Procurement slot API calls.
 */
export const slotService = {
  list: async ({ centreId, dateFrom, dateTo, status, page = 1, pageSize = 20 } = {}) => {
    const { data } = await api.get('/slots/', {
      params: {
        centre_id: centreId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status || undefined,
        page,
        page_size: pageSize,
      },
    });
    return data.data; // { slots, pagination }
  },

  getAvailable: async (centreId) => {
    const { data } = await api.get('/slots/available/', {
      params: { centre_id: centreId },
    });
    return data.data; // { centre, slots }
  },

  get: async (id) => {
    const { data } = await api.get(`/slots/${id}/`);
    return data.data;
  },

  create: async (payload) => {
    const { data } = await api.post('/slots/', payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/slots/${id}/`, payload);
    return data.data;
  },

  setStatus: async (id, isActive) => {
    const { data } = await api.put(`/slots/${id}/status/`, { is_active: isActive });
    return data.data;
  },

  remove: async (id) => {
    const { data } = await api.delete(`/slots/${id}/`);
    return data;
  },
};