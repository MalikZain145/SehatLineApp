// Shared constants for the app.

export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
  LABORATORY: 'laboratory',
  PHARMACY: 'pharmacy',
};

// Where each role lands after login. Adjust route names to match your
// navigator once the role portals are built.
export const ROLE_HOME_ROUTE = {
  patient: 'HomeScreen',
  doctor: 'DoctorPortal',
  admin: 'AdminPortal',
  laboratory: 'LaboratoryPortal',
  pharmacy: 'PharmacyPortal',
};

export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'userData',
  FINGERPRINT: 'device_fingerprint_hash',
};

export default { ROLES, ROLE_HOME_ROUTE, STORAGE_KEYS };
