# Venue Booking System - Implementation Plan

## Information Gathered

The existing system is "SportVault" - a Sports Equipment & Venue Management System with:
- **Backend**: Express.js + MySQL with JWT auth, controllers for auth, admin, booking, venue, equipment, maintenance
- **Frontend**: Vanilla HTML/CSS/JS with role-based UI (student/admin)
- **Database**: Tables for student_ids, users, equipment, equipment_issues, venues, bookings, maintenance
- **Already partially updated**: Setup-db.js has already added is_active to venues, booking_type, and changed booking status ENUM to include 'confirmed'

## Required Changes & Plan

### 1. Admin Dashboard Simplification
- **Remove** equipment, maintenance, student ID sections from admin dashboard HTML
- **Keep only**: Venue Booking Management (CSV upload, venue management, admin booking, all bookings) + Reports Dashboard
- **Update** dashboard.js to remove non-booking stats loading
- **Remove** equipment.html, maintenance.html, reports.html nav links for admin (or keep but simplify)

### 2. Booking Time Restrictions (Already Partially Done)
- `bookingValidation.js` already enforces 10:00-19:00 hours for students
- Add frontend time input constraints: min="10:00" max="19:00" on student booking form
- Validate on frontend before submission

### 3. Block Booked Time Slots (Already Partially Implemented)
- `getAvailableSlots` in bookingController already checks conflicts
- Frontend `booking.js` needs to display available/blocked slots visually
- Add real-time slot availability display when selecting venue+date

### 4. Maximum Booking Duration (Already Done)
- `bookingValidation.js` already enforces MAX_DURATION_HOURS = 2 for non-admin
- Add frontend validation to prevent selections over 2 hours

### 5. Automatic Booking Approval (Remove Manual Approval)
- **Current**: Bookings have pending/approved/rejected workflow
- **Change**: All new bookings auto-confirmed (already done in bookingController.createBooking)
- **Remove** Approve/Reject buttons from frontend
- **Remove** pending status filter/display
- Students see "confirmed" instantly after booking
- **Backend**: Remove any pending-related endpoints/status routes

### 6. Admin Booking Management
- Admin can create bookings on behalf (already in dashboard.html form)
- Admin can cancel any booking (already done)
- Admin can reserve for events (booking_type = 'event'/'admin') (already implemented)
- These slots block student bookings (already in getAvailableSlots)

### 7. Student Data Upload (CSV Import)
- Already partially implemented in adminController.importStudentsBulk
- Need frontend UI in dashboard.html (already there)
- Validate CSV format before importing
- Skip duplicate SAP IDs (already done)
- Display import results (already done)

### 8. Venue Management
- CRUD already exists in venueController
- Toggle active/inactive already exists
- Need frontend UI in admin dashboard (already there)
- Add venue edit form integration

### 9. Booking Conflict Prevention
- Already implemented with findConflictingBookings in bookingController
- All booking types (student/admin/event) block slots
- Real-time availability updates after booking/cancellation
- Need to ensure frontend refreshes availability after booking

## Files to Edit

### Backend:
1. **backend/controllers/bookingController.js** - Remove pending/approve/reject logic, ensure auto-confirm, enhance getAvailableSlots
2. **backend/routes/booking.js** - Remove any status update routes for pending/approve/reject
3. **backend/routes/admin.js** - Keep as is (already has venue management routes)
4. **backend/server.js** - Add venue routes reference, remove/reduce unnecessary route references

### Frontend:
5. **frontend/html/dashboard.html** - Simplify admin dashboard, keep only venue booking mgmt + reports
6. **frontend/html/booking.html** - Add slot availability display, time constraints, remove approve/reject UI for admin
7. **frontend/html/reports.html** - Keep for admin reports
8. **frontend/js/dashboard.js** - Add admin booking management, venue management, CSV upload, venue toggle
9. **frontend/js/booking.js** - Add slot visualization, time validation, remove approve/reject, show confirmed status
10. **frontend/js/reports.js** - Keep as is for report downloads

### Database:
11. **database/schema.sql** - Already updated in setup-db.js (is_active, booking_type, booking status)
12. **backend/setup-db.js** - Already partially updated, may need refinement

## Follow-up Steps
1. Test all endpoints with proper auth
2. Verify time restrictions work (10AM-7PM, max 2 hours)
3. Verify auto-confirmation works
4. Verify slot blocking works for all booking types
5. Test CSV import functionality
6. Test venue CRUD and toggle
7. Verify admin can cancel any booking
8. Verify real-time availability updates

