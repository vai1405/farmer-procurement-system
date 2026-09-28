import api from './api';

/**
 * Queue status and control API calls.
 */
export const queueService = {
  getStatus: async (slotId) => {
    const { data } = await api.get('/queue/status/', { params: { slot_id: slotId } });
    return data.data;
  },

  callNext: async (slotId) => {
    const { data } = await api.post('/queue/call-next/', { slot_id: slotId });
    return data.data;
  },
};