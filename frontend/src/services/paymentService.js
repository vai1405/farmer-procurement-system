import api from './api';

/**
 * Payment record API calls.
 */
export const paymentService = {
  list: async ({ centreId, status, page = 1, pageSize = 20 } = {}) => {
    const { data } = await api.get('/payments/', {
      params: {
        centre_id: centreId || undefined,
        status: status || undefined,
        page,
        page_size: pageSize,
      },
    });
    return data.data; // { payments, pagination }
  },

  get: async (id) => {
    const { data } = await api.get(`/payments/${id}/`);
    return data.data;
  },

  getByProcurement: async (procurementId) => {
    const { data } = await api.get(`/payments/by-procurement/${procurementId}/`);
    return data.data.payment; // null if none exists yet
  },

  create: async (payload) => {
    const { data } = await api.post('/payments/', payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/payments/${id}/`, payload);
    return data.data;
  },

  listMine: async () => {
    const { data } = await api.get('/payments/my/');
    return data.data.payments;
  },
};