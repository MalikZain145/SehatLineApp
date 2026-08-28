// My Prescriptions API — the doctor-issued prescriptions for the logged-in
// patient (read-only). Separate from pharmacyService (self-service orders).

import api from '../../../services/apiClient';

// List the patient's prescriptions, newest first.
async function myPrescriptions() {
  return api.get('/patient/prescriptions');
}

// One prescription's full detail (medicines, tests, live pharmacy status).
async function getPrescription(id) {
  return api.get(`/patient/prescriptions/${id}`);
}

export default { myPrescriptions, getPrescription };
