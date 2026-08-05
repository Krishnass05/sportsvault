# Task Todo

## Goal
1. Constrain admin venue bookings to between 10:00 AM and 7:00 PM.
2. When an admin books a slot that overlaps an existing confirmed booking, auto-cancel the conflicting booking(s).
3. Remove CSV upload option from admin dashboard.
4. Remove venue edit/disable/delete management from admin dashboard.

## Steps
- [x] 1. `backend/utils/bookingValidation.js`: Enforce 10 AM–7 PM range for all roles (including admin).
- [x] 2. `backend/controllers/bookingController.js`: Auto-cancel conflicting confirmed bookings when an admin creates a booking.
- [x] 3. `frontend/js/dashboard.js`: Add 10 AM–7 PM validation to admin booking form; remove CSV upload + venue management functions.
- [x] 4. `frontend/html/dashboard.html`: Remove CSV upload card and venue management card; add min/max time constraints on admin booking inputs.
- [x] 5. Syntax-check backend files.
