import api from './api';

/**
 * Notification API calls.
 */
export const notificationService = {
  list: async ({ unreadOnly = false, page = 1, pageSize = 20 } = {}) => {
    const { data } = await api.get('/notifications/', {
      params: { unread_only: unreadOnly || undefined, page, page_size: pageSize },
    });
    return data.data; // { notifications, unread_count, pagination }
  },

  getUnreadCount: async () => {
    const { data } = await api.get('/notifications/unread-count/');
    return data.data.unread_count;
  },

  markAsRead: async (id) => {
    const { data } = await api.put(`/notifications/${id}/read/`);
    return data.data;
  },

  markAllAsRead: async () => {
    const { data } = await api.put('/notifications/read-all/');
    return data.data;
  },
};