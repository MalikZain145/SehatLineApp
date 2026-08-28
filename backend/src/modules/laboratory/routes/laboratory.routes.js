// Laboratory module routes. Mounted at /api/laboratory. Role 'laboratory'
// (admin may also access for oversight).

const express = require('express');
const authGuard = require('../../../middleware/auth.middleware');
const allowRoles = require('../../../middleware/role.middleware');
const { validateObjectId } = require('../../../middleware/validate');

const queue = require('../controllers/queue.controller');
const test = require('../controllers/test.controller');
const inventory = require('../controllers/inventory.controller');
const misc = require('../controllers/misc.controller');

const router = express.Router();
const labOnly = [authGuard, allowRoles('laboratory', 'admin')];

// Profile
router.get('/profile', labOnly, misc.getProfile);
router.patch('/profile', labOnly, misc.updateProfile);

// Dashboard + live queue
router.get('/dashboard', labOnly, queue.getDashboard);
router.get('/queue', labOnly, queue.getQueue);
router.get('/completed', labOnly, queue.getCompleted);
router.get('/analytics', labOnly, misc.getAnalytics);
router.get('/prescriptions/:id', labOnly, validateObjectId('id'), queue.getPrescription);
router.post('/queue/:id/status', labOnly, validateObjectId('id'), queue.updateStatus);
router.post('/queue/:id/complete', labOnly, validateObjectId('id'), queue.complete);
// Upload a report to a patient by CARD NUMBER (no queue needed).
router.post('/reports/upload', labOnly, queue.uploadReport);

// Test catalog
router.get('/tests', labOnly, test.listTests);
router.get('/tests/:id', labOnly, validateObjectId('id'), test.getTest);
router.post('/tests', labOnly, test.addTest);
router.patch('/tests/:id', labOnly, validateObjectId('id'), test.updateTest);
router.delete('/tests/:id', labOnly, validateObjectId('id'), test.deleteTest);

// Inventory
router.get('/inventory', labOnly, inventory.listItems);
router.post('/inventory', labOnly, inventory.addItem);
router.patch('/inventory/:id', labOnly, validateObjectId('id'), inventory.updateItem);
router.post('/inventory/:id/stock', labOnly, validateObjectId('id'), inventory.addStock);
router.delete('/inventory/:id', labOnly, validateObjectId('id'), inventory.deleteItem);

// Requisitions to admin
router.post('/requisitions', labOnly, misc.createRequisition);
router.get('/requisitions', labOnly, misc.myRequisitions);

// Report a problem to admin
router.post('/report', labOnly, misc.reportToAdmin);

module.exports = router;
