// Admin module routes. Mounted at /api/admin. Every route requires the
// 'admin' role. The admin has full control: doctors, patients, reports.

const express = require('express');
const authGuard = require('../../../middleware/auth.middleware');
const allowRoles = require('../../../middleware/role.middleware');
const { validateObjectId } = require('../../../middleware/validate');
const doctors = require('../controllers/doctor.controller');
const patients = require('../controllers/patient.controller');
const misc = require('../controllers/misc.controller');
const staff = require('../controllers/staff.controller');
const system = require('../controllers/system.controller');
const announcements = require('../controllers/announcement.controller');
const { uploadSheet } = require('../../../middleware/upload');

const router = express.Router();
const adminOnly = [authGuard, allowRoles('admin')];

// Dashboard
router.get('/dashboard', adminOnly, misc.getDashboard);
router.get('/analytics', adminOnly, misc.getAnalytics);

// Live system metrics (queue models, throughput, traffic, app health) + Excel backup
router.get('/system/metrics', adminOnly, system.getMetrics);
router.get('/system/export', adminOnly, system.exportData);
// System cache (view + clear) and one-tap backend restart
router.get('/system/cache', adminOnly, system.getCache);
router.post('/system/cache/clear', adminOnly, system.clearCache);
router.post('/system/restart', adminOnly, system.restartSystem);

// Announcements → broadcast to staff (doctors / pharmacists / laboratory)
router.get('/announcements', adminOnly, announcements.listAnnouncements);
router.post('/announcements', adminOnly, announcements.createAnnouncement);
router.delete('/announcements/:id', adminOnly, validateObjectId('id'), announcements.deleteAnnouncement);

// Doctors — add (single/bulk), list, edit, delete
router.get('/doctors', adminOnly, doctors.listDoctors);
router.post('/doctors', adminOnly, doctors.addDoctor);
router.post('/doctors/bulk', adminOnly, doctors.addDoctorsBulk);
router.post('/doctors/import-excel', adminOnly, uploadSheet.single('file'), doctors.addDoctorsFromExcel);
// NOTE: :doctorId is our own slug (e.g. "cardio_ayesha_k1a2"), NOT a Mongo
// ObjectId — so it must NOT go through validateObjectId (that rejected every
// edit/delete with "invalid identifier"). The controllers look up by the slug.
router.patch('/doctors/:doctorId', adminOnly, doctors.updateDoctor);
router.delete('/doctors/:doctorId', adminOnly, doctors.deleteDoctor);

// Patients — list, classify chronic, delete
router.get('/patients', adminOnly, patients.listPatients);
router.patch('/patients/:id/chronic', adminOnly, validateObjectId('id'), patients.setChronic);
router.delete('/patients/:id', adminOnly, validateObjectId('id'), patients.deletePatient);

// System ratings (patient feedback about the app/queue/staff/facilities)
router.get('/ratings', adminOnly, misc.getRatings);
router.patch('/ratings/:id/reviewed', adminOnly, validateObjectId('id'), misc.markRatingReviewed);

// Reports from doctors
router.get('/reports', adminOnly, misc.listReports);
router.patch('/reports/:id/resolve', adminOnly, validateObjectId('id'), misc.resolveReport);
router.post('/reports/:id/reply', adminOnly, validateObjectId('id'), misc.replyReport);

// Pharmacists (admin creates/manages pharmacy staff)
router.get('/pharmacists', adminOnly, staff.listPharmacists);
router.post('/pharmacists', adminOnly, staff.addPharmacist);
router.post('/pharmacists/bulk', adminOnly, staff.addPharmacistsBulk);
router.post('/pharmacists/import-excel', adminOnly, uploadSheet.single('file'), staff.addPharmacistsFromExcel);
router.delete('/pharmacists/:id', adminOnly, validateObjectId('id'), staff.deletePharmacist);

// Medicine requisitions from pharmacists
router.get('/requisitions', adminOnly, staff.listRequisitions);
router.patch('/requisitions/:id/fulfil', adminOnly, validateObjectId('id'), staff.fulfilRequisition);

// Account
router.post('/change-password', adminOnly, misc.changePassword);

module.exports = router;
