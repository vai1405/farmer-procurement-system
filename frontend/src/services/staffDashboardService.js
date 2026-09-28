import api from './api';

export const staffDashboardService = {
  getDashboard: async () => {
    const { data } = await api.get('/farmers/staff-dashboard/');
    return data.data;
  },

  listFarmers: async ({ q, page = 1, pageSize = 20 } = {}) => {
    const { data } = await api.get('/farmers/directory/', {
      params: { q: q || undefined, page, page_size: pageSize },
    });
    return data.data; // { farmers, pagination }
  },

  getFarmer: async (id) => {
    const { data } = await api.get(`/farmers/directory/${id}/`);
    return data.data;
  },
};