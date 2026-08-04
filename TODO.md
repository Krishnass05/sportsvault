# SportVault - Monthly Report Enhancements TODO

## Steps
- [x] 1. Update `getBookingReports` SQL to select `u.student_id as sap_id`
- [x] 2. reports.html: Add jsPDF CDN script tags before `../js/reports.js`
- [x] 3. reports.html: Add Sport/Venue dropdown after month input (with onchange)
- [x] 4. reports.html: Add "Download PDF" button after "Download CSV"
- [x] 5. reports.html: Add SAP ID `<th>` after "Booked By" header
- [x] 6. reports.html: Update empty-state colspan 9 -> 10
- [x] 7. reports.js: Add `populateVenueFilter()` and call from `loadAllReports()`
- [x] 8. reports.js: Filter bookings + recompute stats in `loadMonthlyReport()` based on venue filter
- [x] 9. reports.js: Add SAP ID `<td>` in row template
- [x] 10. reports.js: Add `downloadMonthlyPDF()` using jsPDF + autotable
- [x] 11. reports.js: Update `downloadMonthlyCSV()` (SAP ID column + venue-aware filename)
- [x] 12. Verify: filter table/stats, SAP ID display, CSV & PDF downloads

## Notes
- jsPDF + jspdf-autotable loaded via CDN (no install needed)
- PDF/CSV filenames include venue name when a specific sport is selected

