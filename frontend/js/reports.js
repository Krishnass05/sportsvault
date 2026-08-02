// SportVault Reports Module - Booking Reports

// Load all initial data
async function loadAllReports() {
    await Promise.all([
        loadSummaryStats(),
        setupReportMonth()
    ]);
}

// Load summary statistics
async function loadSummaryStats() {
    try {
        const [statsData, bookingsData, venuesData] = await Promise.all([
            apiRequest('/admin/dashboard-stats'),
            apiRequest('/bookings'),
            apiRequest('/bookings/venues')
        ]);

        const totalBookings = bookingsData.bookings ? bookingsData.bookings.length : 0;
        document.getElementById('total-bookings-count').textContent = totalBookings;
        document.getElementById('active-students').textContent = statsData.totalStudents || 0;

        const activeVenues = (venuesData.venues || []).filter(v => v.is_active !== false);
        document.getElementById('active-venues-count').textContent = activeVenues.length;

        const today = new Date().toISOString().split('T')[0];
        const todayBookings = (bookingsData.bookings || []).filter(b => b.booking_date === today && b.status === 'confirmed');
        document.getElementById('today-bookings-count').textContent = todayBookings.length;
    } catch (error) {
        console.error('Failed to load summary stats:', error);
    }
}

// Setup report month input
function setupReportMonth() {
    const monthInput = document.getElementById('report-month');
    if (monthInput) {
        const now = new Date();
        monthInput.value = now.toISOString().slice(0, 7);
    }
}

// Load monthly report
async function loadMonthlyReport() {
    const month = document.getElementById('report-month').value;
    if (!month) {
        showAlert('Please select a month', 'warning');
        return;
    }

    try {
        const data = await apiRequest(`/bookings/reports?month=${month}`);

        document.getElementById('report-total').textContent = data.totalBookings || 0;
        document.getElementById('report-confirmed').textContent = data.confirmedBookings || 0;
        document.getElementById('report-cancelled').textContent = data.cancelledBookings || 0;
        document.getElementById('report-student').textContent = (data.byType && data.byType.student) || 0;

        const tbody = document.getElementById('report-bookings-tbody');
        if (!tbody) return;

if (!data.bookings || data.bookings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No bookings for this month</td></tr>';
            } else {
                tbody.innerHTML = data.bookings.map(b => `
                    <tr>
                        <td>${escapeHtml(b.user_name)}</td>
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
    } catch (error) {
        showAlert(error.message || 'Failed to load report', 'error');
    }
}

// Download monthly report as CSV
function downloadMonthlyCSV() {
    const tbody = document.getElementById('report-bookings-tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    if (!rows.length || (rows.length === 1 && rows[0].querySelector('.empty-state'))) {
        showAlert('No report data to download. Load a report first.', 'warning');
        return;
    }

const headers = ['Booked By', 'Venue', 'Date', 'Time', 'Type', 'Approx Students', 'Purpose', 'Status'];
    const dataRows = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 8) {
            dataRows.push([
                cells[0].textContent.trim(),
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim(),
                cells[6].textContent.trim(),
                cells[7].textContent.trim()
            ]);
        }
    });

    if (dataRows.length === 0) {
        showAlert('No report data to download', 'warning');
        return;
    }

    const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `booking_report_${document.getElementById('report-month').value}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('Report downloaded as CSV', 'success');
}

// Cancel booking directly from the reports table (admin only)
async function cancelReportBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
        await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'PUT' });
        showAlert('Booking cancelled successfully', 'success');
        // Reload both the summary stats and the monthly report
        loadSummaryStats();
        loadMonthlyReport();
    } catch (error) {
        showAlert(error.message || 'Failed to cancel booking', 'error');
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

// Initialize reports page
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    const user = getCurrentUser();
    if (user.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
    }

    loadAllReports();
});

