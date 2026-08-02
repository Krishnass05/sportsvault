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
        loadAdminBookings()
    ]);

    initAdminForms();
    initCSVUpload();
    setupReportMonth();
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

// ==================== VENUE MANAGEMENT ====================

async function loadVenues() {
    try {
        const data = await apiRequest('/bookings/venues');
        allVenues = data.venues || [];
        renderVenues(allVenues);

        // Also populate admin booking venue select
        populateVenueSelect();
    } catch (error) {
        console.error('Failed to load venues:', error);
    }
}

function renderVenues(venues) {
    const tbody = document.getElementById('venues-tbody');
    if (!tbody) return;

    if (venues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No venues found</td></tr>';
        return;
    }

    tbody.innerHTML = venues.map(v => `
        <tr>
            <td><strong>${escapeHtml(v.name)}</strong></td>
            <td>${escapeHtml(v.location || 'N/A')}</td>
            <td>${v.capacity || 'N/A'}</td>
            <td>
                <span class="badge ${v.is_active ? 'badge-success' : 'badge-secondary'}">
                    ${v.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editVenue(${v.id})">Edit</button>
                <button class="btn btn-${v.is_active ? 'warning' : 'success'} btn-sm" onclick="toggleVenue(${v.id}, ${!v.is_active})">
                    ${v.is_active ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteVenue(${v.id})">Delete</button>
            </td>
        </tr>
    `).join('');
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

function showVenueForm(venue = null) {
    const container = document.getElementById('venue-form-container');
    container.classList.remove('hidden');

    if (venue) {
        document.getElementById('venue-edit-id').value = venue.id;
        document.getElementById('venue-name').value = venue.name;
        document.getElementById('venue-location').value = venue.location || '';
        document.getElementById('venue-capacity').value = venue.capacity || '';
        document.getElementById('venue-description').value = venue.description || '';
    } else {
        document.getElementById('venue-form').reset();
        document.getElementById('venue-edit-id').value = '';
    }
}

function hideVenueForm() {
    document.getElementById('venue-form-container').classList.add('hidden');
}

async function handleVenueForm(event) {
    event.preventDefault();

    const editId = document.getElementById('venue-edit-id').value;
    const formData = {
        name: document.getElementById('venue-name').value,
        location: document.getElementById('venue-location').value,
        capacity: parseInt(document.getElementById('venue-capacity').value) || null,
        description: document.getElementById('venue-description').value
    };

    try {
        if (editId) {
            await apiRequest(`/bookings/venues/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            showAlert('Venue updated successfully', 'success');
        } else {
            await apiRequest('/bookings/venues', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showAlert('Venue created successfully', 'success');
        }

        hideVenueForm();
        loadVenues();
    } catch (error) {
        showAlert(error.message || 'Failed to save venue', 'error');
    }
}

function editVenue(id) {
    const venue = allVenues.find(v => v.id === id);
    if (venue) showVenueForm(venue);
}

async function toggleVenue(id, isActive) {
    try {
        await apiRequest(`/bookings/venues/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active: isActive })
        });
        showAlert(`Venue ${isActive ? 'enabled' : 'disabled'} successfully`, 'success');
        loadVenues();
    } catch (error) {
        showAlert(error.message || 'Failed to toggle venue', 'error');
    }
}

async function deleteVenue(id) {
    if (!confirm('Are you sure you want to delete this venue?')) return;

    try {
        await apiRequest(`/bookings/venues/${id}`, {
            method: 'DELETE'
        });
        showAlert('Venue deleted successfully', 'success');
        loadVenues();
    } catch (error) {
        showAlert(error.message || 'Failed to delete venue', 'error');
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

    try {
        await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showAlert('Booking created successfully. Confirmation email sent to the student.', 'success');
        event.target.reset();
        loadAdminBookings();
    } catch (error) {
        showAlert(error.message || 'Failed to create booking', 'error');
    }
}

// ==================== CSV UPLOAD ====================

function initCSVUpload() {
    const fileInput = document.getElementById('student-csv-upload');
    if (fileInput) {
        fileInput.addEventListener('change', handleCSVUpload);
    }
}

async function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const resultSpan = document.getElementById('csv-upload-result');
    resultSpan.textContent = 'Parsing CSV...';

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have a header row and at least one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const requiredHeaders = ['SAP ID'];
        const hasHeaders = requiredHeaders.every(h => headers.includes(h));

        if (!hasHeaders) {
            resultSpan.textContent = 'Invalid CSV format. Required column: SAP ID';
            resultSpan.style.color = 'red';
            return;
        }

        const students = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            students.push(row);
        }

        resultSpan.textContent = `Uploading ${students.length} records...`;
        resultSpan.style.color = '#666';

        const data = await apiRequest('/admin/students/import', {
            method: 'POST',
            body: JSON.stringify({ students })
        });

        resultSpan.textContent = `${data.message}`;
        resultSpan.style.color = data.imported > 0 ? 'green' : 'orange';
    } catch (error) {
        resultSpan.textContent = error.message || 'Failed to upload CSV';
        resultSpan.style.color = 'red';
    }
}

// ==================== ADMIN FORM INIT ====================

function initAdminForms() {
    const venueForm = document.getElementById('venue-form');
    if (venueForm) {
        venueForm.addEventListener('submit', handleVenueForm);
    }

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

        document.getElementById('report-total').textContent = data.totalBookings || 0;
        document.getElementById('report-confirmed').textContent = data.confirmedBookings || 0;
        document.getElementById('report-cancelled').textContent = data.cancelledBookings || 0;
        document.getElementById('report-student').textContent = (data.byType && data.byType.student) || 0;

        const tbody = document.getElementById('report-bookings-tbody');
        if (tbody) {
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
        }
    } catch (error) {
        showAlert(error.message || 'Failed to load report', 'error');
    }
}

function downloadMonthlyCSV() {
    const tbody = document.getElementById('report-bookings-tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    const hasData = rows.length > 0 && !rows[0].querySelector('.empty-state');
    if (!hasData) {
        showAlert('No report data to download. Load a report first.', 'warning');
        return;
    }

    const headers = ['Booked By', 'Venue', 'Date', 'Time', 'Type', 'Approx Students', 'Purpose', 'Status'];
    const dataRows = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 8) {
            dataRows.push([
                cells[0].textContent,
                cells[1].textContent,
                cells[2].textContent,
                cells[3].textContent,
                cells[4].textContent,
                cells[5].textContent,
                cells[6].textContent,
                cells[7].textContent
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

// ==================== UTILITY FUNCTIONS ====================

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
window.showVenueForm = showVenueForm;
window.hideVenueForm = hideVenueForm;
window.editVenue = editVenue;
window.toggleVenue = toggleVenue;
window.deleteVenue = deleteVenue;
window.filterAdminBookings = filterAdminBookings;
window.cancelAdminBooking = cancelAdminBooking;
window.cancelReportBooking = cancelReportBooking;
window.loadMonthlyReport = loadMonthlyReport;
window.downloadMonthlyCSV = downloadMonthlyCSV;
