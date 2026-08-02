const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Routes for all authenticated users
router.get('/', maintenanceController.getAllMaintenance);
router.get('/stats', maintenanceController.getMaintenanceStats);

// Admin only routes
router.post('/', requireAdmin, maintenanceController.createMaintenance);
router.put('/:id', requireAdmin, maintenanceController.updateMaintenanceStatus);
router.delete('/:id', requireAdmin, maintenanceController.deleteMaintenance);
router.post('/import', requireAdmin, maintenanceController.importMaintenance);

module.exports = router;
