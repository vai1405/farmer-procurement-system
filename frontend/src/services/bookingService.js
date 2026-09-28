import api from './api';

/**
 * Farmer booking API calls.
 */
export const bookingService = {
  create: async (slotId) => {
    const { data } = await api.post('/bookings/', { slot_id: slotId });
    return data.data;
  },

  list: async (statusList) => {
    const { data } = await api.get('/bookings/', {
      params: statusList ? { status: statusList.join(',') } : {},
    });
    return data.data.bookings;
  },

  get: async (id) => {
    const { data } = await api.get(`/bookings/${id}/`);
    return data.data;
  },

  cancel: async (id, reason) => {
    const { data } = await api.put(`/bookings/${id}/cancel/`, { reason });
    return data.data;
  },
};