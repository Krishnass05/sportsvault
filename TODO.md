# TODO - Fix Booking Response Before Email Sending

## Steps
- [x] Analyze relevant files (bookingController.js, emailService.js, server.js)
- [x] Confirm emailService.js has `family: 4` (already present)
- [x] Confirm server.js has `dns.setDefaultResultOrder('ipv4first')` (already present)
- [x] Update `createBooking` to send response before email, email in async IIFE
- [x] Update `cancelBooking` to send response before email, email in async IIFE
- [x] Syntax check with `node -c`
- [x] Show full updated functions for review
