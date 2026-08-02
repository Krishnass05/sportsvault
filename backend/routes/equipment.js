const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const { verifyToken, requireAdmin, requireStudent } = require('../middleware/auth');

// Public routes (or any authenticated user)
router.get('/', verifyToken, equipmentController.getAllEquipment);
router.get('/stats', verifyToken, equipmentController.getEquipmentStats);

// Admin only routes - MUST be before /:id routes to avoid being caught as ID parameter
router.get('/issues-history', verifyToken, requireAdmin, equipmentController.getEquipmentIssuesHistory);
router.post('/import-issue', verifyToken, requireAdmin, equipmentController.importEquipmentIssue);

// Student routes
router.get('/my/equipment', verifyToken, requireStudent, equipmentController.getMyEquipment);
router.post('/:id/issue', verifyToken, requireStudent, equipmentController.issueEquipment);
router.post('/:id/return', verifyToken, requireStudent, equipmentController.returnEquipment);

// Admin only routes with ID parameter
router.post('/', verifyToken, requireAdmin, equipmentController.createEquipment);
router.put('/:id', verifyToken, requireAdmin, equipmentController.updateEquipment);
router.delete('/:id', verifyToken, requireAdmin, equipmentController.deleteEquipment);
router.get('/:id', verifyToken, equipmentController.getEquipmentById);
router.put('/issues/:id', verifyToken, requireAdmin, equipmentController.updateEquipmentIssue);
router.delete('/issues/:id', verifyToken, requireAdmin, equipmentController.deleteEquipmentIssue);

module.exports = router;
