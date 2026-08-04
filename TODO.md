# TODO — Admin Analytics Charts & PDF Formatting

## PART 1 — Booking Analytics charts
- [x] Explore repo / read dashboard.html and dashboard.js
- [x] Present + confirm edit plan
- [x] 1a. Add Chart.js CDN script tag in dashboard.html
- [x] 1b. Add "Booking Analytics" card markup in dashboard.html
- [x] 3. Add `renderAnalyticsCharts()` call in `loadAdminDashboard()`
- [x] 4. Add analytics functions block in dashboard.js
- [x] 5. Add `renderAnalyticsCharts()` calls in cancel/create success paths
- [x] 6. Add `window.renderAnalyticsCharts` export

## PART 2 — PDF formatting
- [x] 7. Replace `downloadMonthlyPDF()` in dashboard.js with improved version
- [x] 7b. Apply the same enhanced table formatting to `downloadMonthlyPDF()` in reports.js (feedback: data must be shown in a PDF table)

## Verification
- [x] Verify charts render with real booking data (code verified)
- [x] Verify charts refresh after booking changes (code verified)
- [x] Verify PDF formatting — navy header banner, stat boxes, table with alternating rows, page-number footer (both dashboard.js and reports.js)
