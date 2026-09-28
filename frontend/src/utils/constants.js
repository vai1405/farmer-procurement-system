// Role identifiers — must match core/constants.py Roles on the backend.
export const ROLES = {
  FARMER: 'FARMER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
};

// localStorage keys, centralized so we never mistype them.
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
};

// Where each role lands after logging in.
export const ROLE_HOME_ROUTE = {
  [ROLES.FARMER]: '/dashboard',
  [ROLES.STAFF]: '/staff/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
};