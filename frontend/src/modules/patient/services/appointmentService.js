// Appointment API service — cardiology bookings.

import api from '../../../services/apiClient';

// Get available slots for a date (and optional doctor).
async function getSlots(date, doctorId) {
  const q = doctorId ? `?date=${date}&doctorId=${doctorId}` : `?date=${date}`;
  return api.get(`/patient/appointments/slots${q}`);
}

// Book a cardiology appointment.
async function book({ date, time, doctorId, reason }) {
  return api.post('/patient/appointments', { date, time, doctorId, reason });
}

// List my appointments (upcoming + past).
async function myAppointments() {
  return api.get('/patient/appointments');
}

// My active (today's, still-booked) cardiology appointment + how many ahead.
// Null when there's nothing today — mirrors tokenService.getActive().
async function getActive() {
  return api.get('/patient/appointments/active');
}

async function getOne(id) {
  return api.get(`/patient/appointments/${id}`);
}

async function cancel(id) {
  return api.post(`/patient/appointments/${id}/cancel`, {});
}

async function reschedule(id, { date, time, doctorId }) {
  return api.post(`/patient/appointments/${id}/reschedule`, { date, time, doctorId });
}

// Get cardiology doctors from the backend.
async function getDoctors() {
  return api.get('/patient/doctors');
}

export default { getSlots, book, myAppointments, getActive, getOne, cancel, reschedule, getDoctors };
