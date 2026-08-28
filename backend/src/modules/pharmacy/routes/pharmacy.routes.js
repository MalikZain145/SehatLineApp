// Pharmacy module routes. Mounted at /api/pharmacy. Role 'pharmacy' (admin
// may also access for oversight).

const express = require('express');
const authGuard = require('../../../middleware/auth.middleware');
const allowRoles = require('../../../middleware/role.middleware');
const { validateObjectId } = require('../../../middleware/validate');
const queue = require('../controllers/queue.controller');
const inventory = require('../controllers/inventory.controller');
const lp = require('../controllers/lp.controller');
const requisition = require('../controllers/requisition.controller');
const profile = require('../controllers/profile.controller');
const backup = require('../controllers/backup.controller');
const report = require('../controllers/report.controller');

const router = express.Router();
const pharmacyOnly = [authGuard, allowRoles('pharmacy', 'admin')];

// Profile
router.get('/profile', pharmacyOnly, profile.getProfile);
router.patch('/profile', pharmacyOnly, profile.updateProfile);

// Dashboard + live queue
router.get('/dashboard', pharmacyOnly, queue.getDashboard);
router.get('/queue', pharmacyOnly, queue.getQueue);
router.get('/completed', pharmacyOnly, queue.getCompleted);
router.get('/analytics', pharmacyOnly, queue.getAnalytics);
router.get('/prescriptions/:id', pharmacyOnly, validateObjectId('id'), queue.getPrescription);
router.post('/prescriptions/:id/prepare', pharmacyOnly, validateObjectId('id'), queue.startPreparing);
router.post('/prescriptions/:id/ready', pharmacyOnly, validateObjectId('id'), queue.markReady);
router.post('/prescriptions/:id/complete', pharmacyOnly, validateObjectId('id'), queue.complete);

// Loan Prescription (only when out of stock)
router.post('/prescriptions/:id/lp', pharmacyOnly, validateObjectId('id'), lp.createLP);
router.get('/lp', pharmacyOnly, lp.listLP);

// Inventory
router.get('/inventory', pharmacyOnly, inventory.listMedicines);
router.post('/inventory', pharmacyOnly, inventory.addMedicine);
router.patch('/inventory/:id', pharmacyOnly, validateObjectId('id'), inventory.updateMedicine);
router.delete('/inventory/:id', pharmacyOnly, validateObjectId('id'), inventory.deleteMedicine);

// Report to admin
router.post('/report', pharmacyOnly, report.reportToAdmin);

// Requisitions to admin
router.post('/requisitions', pharmacyOnly, requisition.createRequisition);
router.get('/requisitions', pharmacyOnly, requisition.myRequisitions);

// Daily Excel backup (auto at 2 PM; manual + downloads from the Backup screen)
router.get('/backup', pharmacyOnly, backup.listBackups);                       // list of active days
router.post('/backup', pharmacyOnly, backup.createBackup);                     // save today's file on the server
router.get('/backup/export-all/download', pharmacyOnly, backup.exportAll);     // master workbook (must precede :date)
router.get('/backup/:date/download', pharmacyOnly, backup.downloadDay);        // one day's workbook

module.exports = router;
