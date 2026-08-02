const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(verifyToken, requireAdmin);

// Student ID management
router.post('/create-student-id', adminController.createStudentId);
router.post('/students/import', adminController.importStudentsBulk);
router.get('/student-ids', adminController.getStudentIds);
router.delete('/student-ids/:id', adminController.deleteStudentId);

// Dashboard stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// Get all users
router.get('/users', adminController.getAllUsers);

// Admin creation (for setup)
router.post('/create-admin', adminController.createAdmin);

module.exports = router;
