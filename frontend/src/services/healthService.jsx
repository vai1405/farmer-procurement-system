import api from './api';

// Calls the Django backend's health-check endpoint.
// Used only to verify frontend-backend connectivity during setup.
export const checkBackendHealth = async () => {
  const response = await api.get('/health/');
  return response.data;
};