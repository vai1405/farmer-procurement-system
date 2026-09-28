import api from './api';

/**
 * Admin-only API calls: system-wide user management, staff creation,
 * and reports.
 */
export const adminService = {
  listUsers: async ({ role, isActive, q, page = 1, pageSize = 20 } = {}) => {
    const { data } = await api.get('/auth/admin/users/', {
      params: {
        role: role || undefined,
        is_active: isActive === undefined ? undefined : isActive,
        q: q || undefined,
        page,
        page_size: pageSize,
      },
    });
    return data.data; // { users, pagination }
  },

  setUserStatus: async (userId, isActive) => {
    const { data } = await api.put(`/auth/admin/users/${userId}/status/`, {
      is_active: isActive,
    });
    return data.data;
  },

  createStaff: async (payload) => {
    const { data } = await api.post('/auth/admin/staff/', payload);
    return data.data;
  },

  assignStaffCentre: async (userId, centreId) => {
    const { data } = await api.put(`/auth/admin/staff/${userId}/centre/`, {
      centre_id: centreId,
    });
    return data.data;
  },

  getReport: async ({ dateFrom, dateTo } = {}) => {
    const { data } = await api.get('/farmers/reports/', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
    });
    return data.data;
  },
};