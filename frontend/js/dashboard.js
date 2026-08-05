// SportVault Dashboard Module - Venue Booking System

let allVenues = [];
let allBookings = [];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    const user = getCurrentUser();

    // Update welcome message
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) {
        welcomeName.textContent = user.name;
    }

    if (user.role === 'admin') {
        loadAdminDashboard();
    } else {
        loadStudentDashboard();
    }
});

// ==================== STUDENT DASHBOARD ====================

async function loadStudentDashboard() {
    try {
        const data = await apiRequest('/bookings');
        const userBookings = data.bookings || [];
        const confirmed = userBookings.filter(b => b.status === 'confirmed');

        document.getElementById('student-booking-count').textContent = confirmed.length;

        renderStudentBookings(confirmed);
    } catch (error) {
        console.error('Failed to load student bookings:', error);
    }
}

function renderStudentBookings(bookings) {
    const container = document.getElementById('student-bookings-preview');
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = '<div class="empty-state">No upcoming bookings</div>';
        return;
    }

    container.innerHTML = bookings.map(b => `
        <div class="booking-item confirmed">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4>${escapeHtml(b.venue_name)}</h4>
                    <p><strong>Date:</strong> ${formatDate(b.booking_date)}</p>
                    <p><strong>Time:</strong> ${formatTime(b.start_time)} - ${formatTime(b.end_time)}</p>
                    ${b.purpose ? `<p><strong>Purpose:</strong> ${escapeHtml(b.purpose)}</p>` : ''}
                </div>
                <div style="text-align: right;">
                    <span class="badge badge-success">Confirmed</span>
                    <div style="margin-top: 0.5rem;">
                        <button class="btn btn-danger btn-sm" onclick="cancelStudentBooking(${b.id})">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function cancelStudentBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'PUT' });
        showAlert('Booking cancelled successfully. A cancellation email has been sent to the student.', 'success');
        loadStudentDashboard();
    } catch (error) {
        showAlert(error.message || 'Failed to cancel booking', 'error');
    }
}

// ==================== ADMIN DASHBOARD ====================

async function loadAdminDashboard() {
    await Promise.all([
        loadAdminStats(),
        loadVenues(),
        loadAdminBookings(),
        populateVenueFilter()
    ]);

    renderAnalyticsCharts();
    initAdminForms();
    setupReportMonth();
}

// Populate the Sport/Venue filter dropdown with all venues
async function populateVenueFilter() {
    try {
        const data = await apiRequest('/bookings/venues');
        const select = document.getElementById('report-venue-filter');
        if (!select) return;

        const venues = data.venues || [];
        venues.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = v.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load venues:', error);
    }
}

async function loadAdminStats() {
    try {
        const data = await apiRequest('/admin/dashboard-stats');
        document.getElementById('admin-total-bookings').textContent = data.totalBookings || 0;
        document.getElementById('admin-total-students').textContent = data.totalStudents || 0;

        // Get today's bookings
        const today = new Date().toISOString().split('T')[0];
        const bookingsData = await apiRequest('/bookings');
        const todayBookings = (bookingsData.bookings || []).filter(b => b.booking_date === today && b.status === 'confirmed');
        document.getElementById('admin-today-bookings').textContent = todayBookings.length;

        // Get active venues
        const venuesData = await apiRequest('/bookings/venues');
        const activeVenues = (venuesData.venues || []).filter(v => v.is_active !== false);
        document.getElementById('admin-active-venues').textContent = activeVenues.length;
    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}

// ==================== VENUES FOR BOOKING DROPDOWN ====================

async function loadVenues() {
    try {
        const data = await apiRequest('/bookings/venues');
        allVenues = data.venues || [];

        // Populate admin booking venue select
        populateVenueSelect();
    } catch (error) {
        console.error('Failed to load venues:', error);
    }
}

function populateVenueSelect() {
    const select = document.getElementById('admin-booking-venue');
    if (select) {
        select.innerHTML = '<option value="">Select Venue</option>' +
            allVenues.filter(v => v.is_active !== false).map(v =>
                `<option value="${v.id}">${escapeHtml(v.name)}${v.location ? ' - ' + escapeHtml(v.location) : ''}</option>`
            ).join('');
    }
}

// ==================== ADMIN BOOKING MANAGEMENT ====================

async function loadAdminBookings() {
    try {
        const data = await apiRequest('/bookings');
        allBookings = data.bookings || [];
        renderAdminBookings(allBookings);
    } catch (error) {
        console.error('Failed to load admin bookings:', error);
        const container = document.getElementById('admin-bookings-container');
        if (container) container.innerHTML = '<div class="empty-state">Failed to load bookings</div>';
    }
}

function renderAdminBookings(bookings) {
    const container = document.getElementById('admin-bookings-container');
    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = '<div class="empty-state">No bookings found</div>';
        return;
    }

    container.innerHTML = bookings.map(b => {
        // Admin can cancel any confirmed booking (past or upcoming)
        const canCancel = b.status === 'confirmed';
        return `
            <div class="booking-item ${b.status}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                        <h4>${escapeHtml(b.venue_name)}</h4>
                        <p><strong>Booked by:</strong> ${escapeHtml(b.user_name)} (${escapeHtml(b.user_email)})</p>
                        <p><strong>Date:</strong> ${formatDate(b.booking_date)} | <strong>Time:</strong> ${formatTime(b.start_time)} - ${formatTime(b.end_time)}</p>
                        ${b.purpose ? `<p><strong>Purpose:</strong> ${escapeHtml(b.purpose)}</p>` : ''}
                        ${b.approx_students ? `<p><strong>Approx Students:</strong> ${escapeHtml(b.approx_students)}</p>` : ''}
                        <p><strong>Type:</strong> ${b.booking_type || 'student'}</p>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge ${b.status === 'confirmed' ? 'badge-success' : 'badge-secondary'}">${b.status}</span>
                        <div style="margin-top: 0.5rem;">
                            ${canCancel ? `
                                <button class="btn btn-danger btn-sm" onclick="cancelAdminBooking(${b.id})">Cancel Booking</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== ANALYTICS CHARTS ====================

let venuePieChartInstance = null;
let weekdayBarChartInstance = null;
let trendLineChartInstance = null;
let typePieChartInstance = null;

const CHART_COLORS = [
    '#0B1F3A', '#1D4E89', '#2E86AB', '#5DA9E9',
    '#8DC3F0', '#C0392B', '#E67E22', '#27AE60',
    '#8E44AD', '#16A085'
];

function renderAnalyticsCharts() {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, skipping analytics charts');
        return;
    }

    const confirmed = allBookings.filter(b => b.status === 'confirmed');

    renderVenuePieChart(confirmed);
    renderWeekdayBarChart(confirmed);
    renderTrendLineChart(confirmed);
    renderTypePieChart(confirmed);
}

function renderVenuePieChart(confirmed) {
    const canvas = document.getElementById('venue-pie-chart');
    if (!canvas) return;

    const counts = {};
    confirmed.forEach(b => {
        const name = b.venue_name || 'Unknown';
        counts[name] = (counts[name] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if (venuePieChartInstance) venuePieChartInstance.destroy();

    if (labels.length === 0) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    venuePieChartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: CHART_COLORS
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = data.reduce((a, b) => a + b, 0);
                            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return `${ctx.label}: ${ctx.parsed} bookings (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderWeekdayBarChart(confirmed) {
    const canvas = document.getElementById('weekday-bar-chart');
    if (!canvas) return;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    confirmed.forEach(b => {
        const d = new Date(b.booking_date + 'T00:00:00');
        if (!isNaN(d)) counts[d.getDay()]++;
    });

    if (weekdayBarChartInstance) weekdayBarChartInstance.destroy();

    weekdayBarChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: dayNames,
            datasets: [{
                label: 'Confirmed Bookings',
                data: counts,
                backgroundColor: '#1D4E89'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function renderTrendLineChart(confirmed) {
    const canvas = document.getElementById('trend-line-chart');
    if (!canvas) return;

    const days = [];
    const counts = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        days.push(key);
        counts[key] = 0;
    }

    confirmed.forEach(b => {
        if (counts.hasOwnProperty(b.booking_date)) {
            counts[b.booking_date]++;
        }
    });

    if (trendLineChartInstance) trendLineChartInstance.destroy();

    trendLineChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: days.map(d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Bookings',
                data: days.map(d => counts[d]),
                borderColor: '#2E86AB',
                backgroundColor: 'rgba(46, 134, 171, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { ticks: { maxRotation: 60, minRotation: 45 } }
            }
        }
    });
}

function renderTypePieChart(confirmed) {
    const canvas = document.getElementById('type-pie-chart');
    if (!canvas) return;

    const counts = {};
    confirmed.forEach(b => {
        const type = b.booking_type || 'student';
        counts[type] = (counts[type] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if (typePieChartInstance) typePieChartInstance.destroy();

    if (labels.length === 0) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    typePieChartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                data,
                backgroundColor: ['#0B1F3A', '#E67E22', '#27AE60']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function filterAdminBookings(filter) {
    if (filter === 'all') {
        renderAdminBookings(allBookings);
    } else {
        renderAdminBookings(allBookings.filter(b => b.status === filter));
    }
}

async function cancelAdminBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'PUT' });
        showAlert('Booking cancelled successfully', 'success');
        loadAdminBookings();
        renderAnalyticsCharts();
        // Refresh the monthly report if it is currently displayed
        const month = document.getElementById('report-month');
        if (month && month.value) {
            loadMonthlyReport();
        }
    } catch (error) {
        showAlert(error.message || 'Failed to cancel booking', 'error');
    }
}

// Cancel booking directly from the reports table (admin only)
async function cancelReportBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'PUT' });
        showAlert('Booking cancelled successfully', 'success');
        // Reload both the admin bookings list and the monthly report
        loadAdminBookings();
        renderAnalyticsCharts();
        const month = document.getElementById('report-month');
        if (month && month.value) {
            loadMonthlyReport();
        }
    } catch (error) {
        showAlert(error.message || 'Failed to cancel booking', 'error');
    }
}

// ==================== ADMIN BOOKING FORM ====================

async function handleAdminBooking(event) {
    event.preventDefault();

    const formData = {
        venue_id: document.getElementById('admin-booking-venue').value,
        booking_date: document.getElementById('admin-booking-date').value,
        start_time: document.getElementById('admin-booking-start').value,
        end_time: document.getElementById('admin-booking-end').value,
        purpose: document.getElementById('admin-booking-purpose').value,
        approx_students: document.getElementById('admin-booking-approx-students') ? document.getElementById('admin-booking-approx-students').value : '',
        booking_type: document.getElementById('admin-booking-type').value
    };

    if (!formData.venue_id || !formData.booking_date || !formData.start_time || !formData.end_time) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }

    // Validate time range: bookings only allowed between 10:00 AM and 7:00 PM
    const startMin = timeToMinutes(formData.start_time);
    const endMin = timeToMinutes(formData.end_time);

    if (startMin >= endMin) {
        showAlert('End time must be after start time', 'warning');
        return;
    }

    if (startMin < 600 || endMin > 1140) { // 600 = 10:00, 1140 = 19:00
        showAlert('Bookings are only allowed between 10:00 AM and 7:00 PM', 'warning');
        return;
    }

    try {
        await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showAlert('Booking created successfully. Confirmation email sent to the student.', 'success');
        event.target.reset();
        loadAdminBookings();
        renderAnalyticsCharts();
    } catch (error) {
        showAlert(error.message || 'Failed to create booking', 'error');
    }
}

// ==================== ADMIN FORM INIT ====================

function initAdminForms() {
    const adminBookingForm = document.getElementById('admin-booking-form');
    if (adminBookingForm) {
        adminBookingForm.addEventListener('submit', handleAdminBooking);

        // Set min date for admin booking
        const dateInput = document.getElementById('admin-booking-date');
        if (dateInput) {
            dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
        }
    }
}

// ==================== MONTHLY REPORTS ====================

function setupReportMonth() {
    const monthInput = document.getElementById('report-month');
    if (monthInput) {
        const now = new Date();
        monthInput.value = now.toISOString().slice(0, 7);
    }
}

async function loadMonthlyReport() {
    const month = document.getElementById('report-month').value;
    if (!month) {
        showAlert('Please select a month', 'warning');
        return;
    }

    try {
        const data = await apiRequest(`/bookings/reports?month=${month}`);

        // Apply venue/sport filter when a specific venue is selected
        let bookings = data.bookings || [];
        const venueFilter = document.getElementById('report-venue-filter');
        const selectedVenueId = venueFilter ? venueFilter.value : 'all';

        if (selectedVenueId && selectedVenueId !== 'all') {
            bookings = bookings.filter(b => String(b.venue_id) === String(selectedVenueId));
        }

        // Compute stats from the (possibly filtered) booking set
        const confirmed = bookings.filter(b => b.status === 'confirmed');
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        const studentCount = confirmed.filter(b => (b.booking_type || 'student') === 'student').length;

        document.getElementById('report-total').textContent = bookings.length;
        document.getElementById('report-confirmed').textContent = confirmed.length;
        document.getElementById('report-cancelled').textContent = cancelled.length;
        document.getElementById('report-student').textContent = studentCount;

        const tbody = document.getElementById('report-bookings-tbody');
        if (tbody) {
            if (!bookings.length) {
                tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No bookings for this month</td></tr>';
            } else {
                tbody.innerHTML = bookings.map(b => `
                    <tr>
                        <td>${escapeHtml(b.user_name)}</td>
                        <td>${escapeHtml(b.sap_id || '-')}</td>
                        <td>${escapeHtml(b.venue_name)}</td>
                        <td>${formatDate(b.booking_date)}</td>
                        <td>${formatTime(b.start_time)} - ${formatTime(b.end_time)}</td>
                        <td>${b.booking_type || 'student'}</td>
                        <td>${b.approx_students ? escapeHtml(b.approx_students) : '-'}</td>
                        <td>${escapeHtml(b.purpose || '-')}</td>
                        <td><span class="badge ${b.status === 'confirmed' ? 'badge-success' : 'badge-secondary'}">${b.status}</span></td>
                        <td>
                            ${b.status === 'confirmed' ? `
                                <button class="btn btn-danger btn-sm" onclick="cancelReportBooking(${b.id})">Cancel</button>
                            ` : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        showAlert(error.message || 'Failed to load report', 'error');
    }
}

// Build a sanitized base filename reflecting the active venue filter
function buildDownloadBaseName() {
    const month = document.getElementById('report-month').value || 'month';
    const venueFilter = document.getElementById('report-venue-filter');
    const selectedVenueId = venueFilter ? venueFilter.value : 'all';
    const selectedOption = venueFilter ? venueFilter.options[venueFilter.selectedIndex] : null;

    if (selectedVenueId && selectedVenueId !== 'all' && selectedOption) {
        // Include the venue/sport name in the filename
        const venueName = selectedOption.textContent || 'venue';
        return `booking_report_${venueName.replace(/[\s/\\]+/g, '_')}_${month}`;
    }
    return `booking_report_${month}`;
}

// Download monthly report as PDF
function downloadMonthlyPDF() {
    const tbody = document.getElementById('report-bookings-tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    const hasData = rows.length > 0 && !rows[0].querySelector('.empty-state');
    if (!hasData) {
        showAlert('No report data to download. Load a report first.', 'warning');
        return;
    }

    const month = document.getElementById('report-month').value || 'month';
    const venueFilter = document.getElementById('report-venue-filter');
    const selectedVenueId = venueFilter ? venueFilter.value : 'all';
    const selectedOption = venueFilter ? venueFilter.options[venueFilter.selectedIndex] : null;

    let title = `Booking Report — ${month}`;
    if (selectedVenueId && selectedVenueId !== 'all' && selectedOption) {
        title = `${selectedOption.textContent} — Booking Report — ${month}`;
    }

    const headers = ['Booked By', 'SAP ID', 'Venue', 'Date', 'Time', 'Type', 'Approx Students', 'Purpose', 'Status'];
    const dataRows = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 9) {
            dataRows.push([
                cells[0].textContent.trim(),
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim(),
                cells[6].textContent.trim(),
                cells[7].textContent.trim(),
                cells[8].textContent.trim()
            ]);
        }
    });

    if (dataRows.length === 0) {
        showAlert('No report data to download', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header banner
    doc.setFillColor(11, 31, 58); // #0B1F3A
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('NMIMS BLR', 14, 11);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(title, 14, 18);

    const generatedOn = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
    doc.setFontSize(9);
    doc.text(`Generated: ${generatedOn}`, pageWidth - 14, 18, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Summary stat boxes
    const total = document.getElementById('report-total').textContent;
    const confirmed = document.getElementById('report-confirmed').textContent;
    const cancelled = document.getElementById('report-cancelled').textContent;
    const student = document.getElementById('report-student').textContent;

    const stats = [
        { label: 'Total Bookings', value: total },
        { label: 'Confirmed', value: confirmed },
        { label: 'Cancelled', value: cancelled },
        { label: 'Student Bookings', value: student }
    ];

    const boxWidth = (pageWidth - 28) / 4;
    let boxX = 14;
    const boxY = 30;

    stats.forEach(stat => {
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(220, 224, 230);
        doc.roundedRect(boxX, boxY, boxWidth - 4, 16, 2, 2, 'FD');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(11, 31, 58);
        doc.text(String(stat.value), boxX + (boxWidth - 4) / 2, boxY + 7, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(stat.label, boxX + (boxWidth - 4) / 2, boxY + 13, { align: 'center' });
        boxX += boxWidth;
    });

    doc.setTextColor(0, 0, 0);

    // Main table
    doc.autoTable({
        head: [headers],
        body: dataRows,
        startY: 52,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [11, 31, 58], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 22 },
            2: { cellWidth: 30 },
            7: { cellWidth: 45 }
        },
        didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            const pageCurrent = doc.internal.getCurrentPageInfo().pageNumber;
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 130);
            doc.text(
                `Page ${pageCurrent} of ${pageCount}`,
                pageWidth - 14,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'right' }
            );
            doc.text('NMIMS BLR Sports Management System', 14, doc.internal.pageSize.getHeight() - 8);
        }
    });

    doc.save(`${buildDownloadBaseName()}.pdf`);
    showAlert('Report downloaded as PDF', 'success');
}

// ==================== UTILITY FUNCTIONS ====================

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Expose functions to global scope for inline onclick handlers
window.cancelStudentBooking = cancelStudentBooking;
window.filterAdminBookings = filterAdminBookings;
window.cancelAdminBooking = cancelAdminBooking;
window.cancelReportBooking = cancelReportBooking;
window.loadMonthlyReport = loadMonthlyReport;
window.downloadMonthlyPDF = downloadMonthlyPDF;
window.renderAnalyticsCharts = renderAnalyticsCharts;
