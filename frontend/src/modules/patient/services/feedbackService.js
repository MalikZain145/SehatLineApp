// Doctor feedback API service — talks to /api/patient/feedback

import api from '../../../services/apiClient';

// The visit (if any) the patient still needs to rate before booking again.
async function getPending() {
  return api.get('/patient/feedback/pending');
}

// Submit the rating + accountability answers for a visit.
async function submit(payload) {
  // payload: { visitId, visitType, doctorId, doctorName, department,
  //            rating, harassed, bothered, extraCharges, notes }
  return api.post('/patient/feedback', payload);
}

export default { getPending, submit };
