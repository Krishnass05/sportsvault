// SportVault Reports Module - Booking Reports

// Load all initial data
async function loadAllReports() {
    await Promise.all([
        loadSummaryStats(),
        setupReportMonth(),
        populateVenueFilter()
    ]);
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
        if (!tbody) return;

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

// Download monthly report as CSV
function downloadMonthlyCSV() {
    const tbody = document.getElementById('report-bookings-tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    if (!rows.length || (rows.length === 1 && rows[0].querySelector('.empty-state'))) {
        showAlert('No report data to download. Load a report first.', 'warning');
        return;
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

    const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

link.setAttribute('href', url);
    link.setAttribute('download', `${buildDownloadBaseName()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('Report downloaded as CSV', 'success');
}

// Download monthly report as PDF
function downloadMonthlyPDF() {
    const tbody = document.getElementById('report-bookings-tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    if (!rows.length || (rows.length === 1 && rows[0].querySelector('.empty-state'))) {
        showAlert('No report data to download. Load a report first.', 'warning');
        return;
    }

    const month = document.getElementById('report-month').value || 'month';
    const venueFilter = document.getElementById('report-venue-filter');
    const selectedVenueId = venueFilter ? venueFilter.value : 'all';
    const selectedOption = venueFilter ? venueFilter.options[venueFilter.selectedIndex] : null;

// Build the dynamic title
    let title = `SportVault - Booking Report - ${month}`;
    if (selectedVenueId && selectedVenueId !== 'all' && selectedOption) {
        title = `SportVault - ${selectedOption.textContent} Booking Report - ${month}`;
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

    // Main data table
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
            doc.text('NMIMS BLR — SportsVenue Management System', 14, doc.internal.pageSize.getHeight() - 8);
        }
    });

    doc.save(`${buildDownloadBaseName()}.pdf`);
    showAlert('Report downloaded as PDF', 'success');
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

