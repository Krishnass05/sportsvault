// SportVault Booking Module

let allBookings = [];
let venues = [];
let availableSlots = [];

// Load all venues
async function loadVenues() {
    try {
        const data = await apiRequest('/bookings/venues');
        venues = data.venues;

        const venueSelect = document.getElementById('booking-venue');
        if (venueSelect) {
            venueSelect.innerHTML = '<option value="">Select Venue</option>' +
                venues.map(v => `<option value="${v.id}">${escapeHtml(v.name)} - ${escapeHtml(v.location)}</option>`).join('');
        }

        // Display venues info
        renderVenuesInfo(venues);
    } catch (error) {
        console.error('Failed to load venues:', error);
    }
}

// Render venues information
function renderVenuesInfo(venues) {
    const container = document.getElementById('venues-info');
    if (!container) return;

    if (venues.length === 0) {
        container.innerHTML = '<p>No venues available</p>';
        return;
    }

    container.innerHTML = venues.map(v => `
        <div style="padding: 1rem; border-bottom: 1px solid #e0e0e0;">
            <h4 style="margin: 0 0 0.5rem 0; color: #0B1F3A;">${escapeHtml(v.name)}</h4>
            <p style="margin: 0.25rem 0; color: #666;"><strong>Location:</strong> ${escapeHtml(v.location || 'N/A')}</p>
            <p style="margin: 0.25rem 0; color: #666;"><strong>Capacity:</strong> ${v.capacity || 'N/A'} people</p>
            ${v.description ? `<p style="margin: 0.25rem 0; color: #666; font-size: 0.9rem;">${escapeHtml(v.description)}</p>` : ''}
        </div>
    `).join('');
}

// Load all bookings
async function loadBookings() {
    try {
        const data = await apiRequest('/bookings');
        allBookings = data.bookings;
        renderBookings(allBookings);
        renderMyBookings(allBookings);
    } catch (error) {
        console.error('Failed to load bookings:', error);
        showAlert('Failed to load bookings', 'error');
    }
}

// Render bookings list (for admin - all bookings)
function renderBookings(bookings) {
    const container = document.getElementById('bookings-container');
    const user = getCurrentUser();

    if (!container) return;

    if (bookings.length === 0) {
        container.innerHTML = '<div class="empty-state">No bookings found</div>';
        return;
    }

    container.innerHTML = bookings.map(booking => {
        const isUpcoming = new Date(booking.booking_date + 'T' + booking.end_time) > new Date();
        // Admin can cancel any confirmed booking (past or upcoming); students only upcoming
        const canCancel = booking.status === 'confirmed' && (user.role === 'admin' || isUpcoming);

        return `
            <div class="booking-item ${booking.status}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4>${escapeHtml(booking.venue_name)}</h4>
                        <p><strong>Date:</strong> ${formatDate(booking.booking_date)}</p>
                        <p><strong>Time:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
                        ${booking.purpose ? `<p><strong>Purpose:</strong> ${escapeHtml(booking.purpose)}</p>` : ''}
                        ${booking.approx_students ? `<p><strong>Approx Students:</strong> ${escapeHtml(booking.approx_students)}</p>` : ''}
                        ${user.role === 'admin' ? `<p><strong>Booked by:</strong> ${escapeHtml(booking.user_name)} (${escapeHtml(booking.user_email)})</p>` : ''}
                        <p><strong>Type:</strong> ${booking.booking_type || 'student'}</p>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge ${booking.status === 'confirmed' ? 'badge-success' : 'badge-secondary'}">${booking.status}</span>
                        <div style="margin-top: 0.5rem;">
                            ${canCancel ? `
                                <button class="btn btn-danger btn-sm" onclick="cancelBooking(${booking.id})">Cancel</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render my bookings (for student)
function renderMyBookings(bookings) {
    const container = document.getElementById('my-bookings-container');
    if (!container) return;

    const user = getCurrentUser();
    const myBookings = bookings.filter(b => b.user_id === user.id);

    if (myBookings.length === 0) {
        container.innerHTML = '<div class="empty-state">You have no bookings</div>';
        return;
    }

    container.innerHTML = myBookings.map(booking => `
        <div class="booking-item ${booking.status}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4>${escapeHtml(booking.venue_name)}</h4>
                    <p><strong>Date:</strong> ${formatDate(booking.booking_date)}</p>
                    <p><strong>Time:</strong> ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</p>
                    ${booking.purpose ? `<p><strong>Purpose:</strong> ${escapeHtml(booking.purpose)}</p>` : ''}
                    ${booking.approx_students ? `<p><strong>Approx Students:</strong> ${escapeHtml(booking.approx_students)}</p>` : ''}
                </div>
                <div style="text-align: right;">
                    <span class="badge ${booking.status === 'confirmed' ? 'badge-success' : 'badge-secondary'}">${booking.status}</span>
                    <div style="margin-top: 0.5rem;">
                        ${booking.status === 'confirmed' ? `
                            <button class="btn btn-danger btn-sm" onclick="cancelBooking(${booking.id})">Cancel</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== AVAILABLE SLOTS ====================

// Load available slots when venue or date changes
async function loadAvailableSlots() {
    const venueId = document.getElementById('booking-venue').value;
    const date = document.getElementById('booking-date').value;

    if (!venueId || !date) {
        const container = document.getElementById('slots-container');
        if (container) {
            container.innerHTML = '<p style="color: #666; padding: 1rem;">Select a venue and date to view available slots</p>';
        }
        return;
    }

    try {
        const data = await apiRequest(`/bookings/available-slots?venue_id=${venueId}&date=${date}`);
        availableSlots = data.slots || [];
        renderSlots(availableSlots);
    } catch (error) {
        console.error('Failed to load slots:', error);
    }
}

function renderSlots(slots) {
    const container = document.getElementById('slots-container');
    if (!container) return;

    if (!slots || slots.length === 0) {
        container.innerHTML = '<p style="color: #666; padding: 1rem;">No slots available for this date</p>';
        return;
    }

    const operatingHours = '10:00 AM - 7:00 PM';
    let html = `<p style="padding: 0.5rem 0; color: #0B1F3A; font-weight: 600;">Operating Hours: ${operatingHours}</p>`;
    html += '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.5rem 0;">';

    slots.forEach(slot => {
        const isBooked = !slot.available;
        const reason = slot.reason || 'Booked';
        html += `
            <div style="
                padding: 0.5rem 0.75rem;
                border-radius: 4px;
                font-size: 0.85rem;
                font-weight: 500;
                cursor: ${isBooked ? 'not-allowed' : 'pointer'};
                background-color: ${isBooked ? '#f8d7da' : '#d4edda'};
                color: ${isBooked ? '#721c24' : '#155724'};
                border: 1px solid ${isBooked ? '#f5c6cb' : '#c3e6cb'};
                opacity: ${isBooked ? '0.8' : '1'};
                transition: transform 0.1s;
            "
            onclick="${isBooked ? '' : `selectSlot('${slot.start}', '${slot.end}')`}"
            title="${isBooked ? reason : 'Click to select this slot'}">
                ${slot.start} - ${slot.end}
                ${isBooked ? `<br><small>${reason}</small>` : '<br><small>Available</small>'}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function selectSlot(start, end) {
    document.getElementById('booking-start-time').value = start;
    document.getElementById('booking-end-time').value = end;

    // Highlight selected slot
    const allSlotDivs = document.getElementById('slots-container').querySelectorAll('div[style*="cursor: pointer"]');
    allSlotDivs.forEach(div => {
        if (div.textContent.includes(`${start} - ${end}`)) {
            div.style.outline = '2px solid #0B1F3A';
            div.style.transform = 'scale(1.05)';
        } else {
            div.style.outline = 'none';
            div.style.transform = 'none';
        }
    });
}

// Create new booking
// Create new booking
async function createBooking(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return; // extra safety against rapid double-clicks
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Booking...';

    const formData = {
        venue_id: document.getElementById('booking-venue').value,
        booking_date: document.getElementById('booking-date').value,
        start_time: document.getElementById('booking-start-time').value,
        end_time: document.getElementById('booking-end-time').value,
        purpose: document.getElementById('booking-purpose').value,
        approx_students: document.getElementById('booking-approx-students') ? document.getElementById('booking-approx-students').value : ''
    };

    // Validate
    if (!formData.venue_id || !formData.booking_date || !formData.start_time || !formData.end_time) {
        showAlert('Please fill in all required fields', 'warning');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    // Validate time
    if (formData.start_time >= formData.end_time) {
        showAlert('End time must be after start time', 'warning');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    // Validate time range: 10:00 - 19:00
    const startMin = timeToMinutes(formData.start_time);
    const endMin = timeToMinutes(formData.end_time);

    if (startMin < 600 || endMin > 1140) { // 600 = 10:00, 1140 = 19:00
        showAlert('Bookings are only allowed between 10:00 AM and 7:00 PM', 'warning');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    // Validate max duration: 2 hours
    const durationHours = (endMin - startMin) / 60;
    if (durationHours > 2) {
        showAlert('Maximum booking duration is 2 hours', 'warning');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        showAlert('Cannot book for past dates', 'warning');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    try {
        const result = await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        showAlert('Booking confirmed successfully! A confirmation email has been sent to your registered email address.', 'success');
        event.target.reset();
        loadBookings();
        loadAvailableSlots();

        // Clear selected time
        document.getElementById('booking-start-time').value = '';
        document.getElementById('booking-end-time').value = '';
        const container = document.getElementById('slots-container');
        if (container) {
            container.innerHTML = '<p style="color: #666; padding: 1rem;">Select a venue and date to view available slots</p>';
        }
    } catch (error) {
        showAlert(error.message || 'Failed to create booking', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}
// Cancel booking
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    try {
        await apiRequest(`/bookings/${bookingId}/cancel`, {
            method: 'PUT'
        });

        showAlert('Booking cancelled successfully', 'success');
        loadBookings();
        loadAvailableSlots();
    } catch (error) {
        showAlert(error.message || 'Failed to cancel booking', 'error');
    }
}

// Filter bookings by status
function filterBookings(filter) {
    if (filter === 'all') {
        renderBookings(allBookings);
    } else {
        const filtered = allBookings.filter(b => b.status === filter);
        renderBookings(filtered);
    }
}

// Utility functions
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

// Initialize booking page
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    loadVenues();
    loadBookings();

    // Set minimum date to today
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);

        // Load slots when date changes
        dateInput.addEventListener('change', loadAvailableSlots);
    }

    // Load slots when venue changes
    const venueSelect = document.getElementById('booking-venue');
    if (venueSelect) {
        venueSelect.addEventListener('change', loadAvailableSlots);
    }

    // Event listeners
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', createBooking);
    }

    // Filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBookings(e.target.dataset.filter);
        });
    });
});

