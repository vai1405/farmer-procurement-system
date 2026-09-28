import api from './api';

/**
 * Procurement record API calls.
 */
export const procurementService = {
  list: async ({ centreId, farmerId, status, dateFrom, dateTo, page = 1, pageSize = 20 } = {}) => {
    const { data } = await api.get('/procurement/', {
      params: {
        centre_id: centreId || undefined,
        farmer_id: farmerId || undefined,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: pageSize,
      },
    });
    return data.data; // { procurements, pagination }
  },

  get: async (id) => {
    const { data } = await api.get(`/procurement/${id}/`);
    return data.data;
  },

  getByBooking: async (bookingId) => {
    const { data } = await api.get(`/procurement/by-booking/${bookingId}/`);
    return data.data.procurement; // null if none exists yet
  },

  create: async (payload) => {
    const { data } = await api.post('/procurement/', payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/procurement/${id}/`, payload);
    return data.data;
  },
};