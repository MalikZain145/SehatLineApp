// Doctor module routes. Mounted at /api/doctor in app.js.
// Every route requires a valid session AND the 'doctor' role.
//
// Controllers are split by domain (mirroring the patient portal), each mapping
// to the doctor frontend screens it powers:
//   profile.controller       → DoctorProfileScreen / DoctorEditProfileScreen
//   queue.controller         → DoctorPortalScreen / TodayQueueScreen /
//                              RealTimeQueueScreen / DoctorDashboardScreen
//   consultation.controller  → CallNextPatientScreen / ConsultationScreen
//   reviews.controller       → DoctorReviewsScreen
//   notification.controller  → DoctorNotificationsScreen

const express = require('express');
const profile = require('../controllers/profile.controller');
const queue = require('../controllers/queue.controller');
const consultation = require('../controllers/consultation.controller');
const reviews = require('../controllers/reviews.controller');
const notification = require('../controllers/notification.controller');
const availability = require('../controllers/availability.controller');
const report = require('../controllers/report.controller');
const authGuard = require('../../../middleware/auth.middleware');
const allowRoles = require('../../../middleware/role.middleware');
const { validateObjectId } = require('../../../middleware/validate');

const router = express.Router();
const doctorOnly = [authGuard, allowRoles('doctor')];

// Queue / dashboard (DoctorPortal, TodayQueue, RealTimeQueue, Dashboard)
router.get('/dashboard', doctorOnly, queue.getDashboard);
router.get('/queue', doctorOnly, queue.getQueue);
router.get('/my-queue', doctorOnly, queue.getMyQueue);

// Profile (DoctorProfile, DoctorEditProfile)
router.get('/profile', doctorOnly, profile.getProfile);
router.patch('/profile', doctorOnly, profile.updateProfile);

// Doctor workspace settings (notification prefs, consultation duration, etc.)
router.get('/settings', doctorOnly, profile.getSettings);
router.patch('/settings', doctorOnly, profile.updateSettings);

// Availability (DoctorAvailability) — working days + hours shown to patients
router.get('/availability', doctorOnly, availability.getAvailability);
router.patch('/availability', doctorOnly, availability.updateAvailability);

// Consultation (CallNextPatient, Consultation)
router.get('/consult/:tokenId', doctorOnly, validateObjectId('tokenId'), consultation.getConsultation);
router.post('/consult/:tokenId/start', doctorOnly, validateObjectId('tokenId'), queue.startConsult);
router.post('/consult/:tokenId/proceed', doctorOnly, validateObjectId('tokenId'), consultation.proceed);
router.post('/consult/:tokenId/chronic', doctorOnly, validateObjectId('tokenId'), consultation.markChronic);

// Catalogs the prescription form pulls from (active lab tests + inventory meds)
router.get('/lab-tests', doctorOnly, consultation.getLabTests);
router.get('/medicines', doctorOnly, consultation.getMedicineCatalog);

// Notifications (DoctorNotifications)
router.get('/notifications', doctorOnly, notification.getNotifications);
router.post('/notifications/read-all', doctorOnly, notification.markAllNotificationsRead);

// Reviews (DoctorReviews)
router.get('/reviews', doctorOnly, reviews.getReviews);
router.post('/reviews/:id/reply', doctorOnly, validateObjectId('id'), reviews.replyToReview);

// Report to admin (DoctorSettings)
router.post('/report', doctorOnly, report.reportToAdmin);

// Awareness Camps — a doctor (chronic or OPD) runs their own camps; they show
// to patients in the Awareness Camps tab.
const camp = require('../controllers/camp.controller');
router.get('/camps', doctorOnly, camp.listMyCamps);
router.post('/camps', doctorOnly, camp.createCamp);
router.delete('/camps/:id', doctorOnly, validateObjectId('id'), camp.deleteCamp);

module.exports = router;
