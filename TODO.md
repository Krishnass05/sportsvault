# TODO - Implementation Steps

## Admin Cancel Any Booking + Credits Footer

### Task 1: Admin can cancel any booking
- [x] Backend already supports admin cancel via `PUT /api/bookings/:id/cancel` (bookingController.js)
- [x] Update `frontend/js/booking.js` - show Cancel for any confirmed booking in admin view
- [x] Update `frontend/js/dashboard.js` - show Cancel Booking for any confirmed booking in admin dashboard
- [x] Add cancel action to reports table in `frontend/js/dashboard.js` (report bookings tbody)
- [x] Add `cancelReportBooking()` in `frontend/js/reports.js` and expose globally
- [x] Add "Action" column to report tables in `dashboard.html` and `reports.html`
- [x] Update empty-state colspan in report tables (8 -> 9)

### Task 2: Credits section on every page
- [x] Add `.credits` footer styling to `frontend/css/styles.css`
- [x] Add credits footer to `login.html`
- [x] Add credits footer to `register.html`
- [x] Add credits footer to `dashboard.html`
- [x] Add credits footer to `booking.html`
- [x] Add credits footer to `reports.html`
- [x] Add credits footer to `equipment.html`
- [x] Add credits footer to `maintenance.html`

### Task 3: Test
- [ ] All tasks completed. Restart server and verify all changes work.

