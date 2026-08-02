const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const venueController = require('../controllers/venueController');
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Reports (admin) - before parameterized routes
router.get('/reports', verifyToken, requireAdmin, bookingController.getBookingReports);

// Venue management (admin)
router.post('/venues', verifyToken, requireAdmin, venueController.createVenue);
router.put('/venues/:id', verifyToken, requireAdmin, venueController.updateVenue);
router.patch('/venues/:id/status', verifyToken, requireAdmin, venueController.toggleVenueStatus);
router.delete('/venues/:id', verifyToken, requireAdmin, venueController.deleteVenue);

// Shared authenticated routes
router.get('/', verifyToken, bookingController.getAllBookings);
router.post('/', verifyToken, bookingController.createBooking);
router.get('/venues', verifyToken, venueController.getAllVenues);
router.get('/available-slots', verifyToken, bookingController.getAvailableSlots);

router.put('/:id/cancel', verifyToken, bookingController.cancelBooking);

// Admin only - create booking on behalf
router.post('/admin-booking', verifyToken, requireAdmin, bookingController.createBooking);

module.exports = router;
