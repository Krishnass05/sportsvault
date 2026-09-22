const BOOKING_START_HOUR = 10; // 10:00 AM
const BOOKING_END_HOUR = 19;   // 7:00 PM
const MAX_DURATION_HOURS = 2;
const BLOCKED_SATURDAY_MESSAGE = 'Bookings are not allowed on the 1st and 3rd Saturday of the month (facility closed for maintenance).';

// True if the given date falls on the 1st or 3rd Saturday of its month.
function isBlockedSaturday(dateInput) {
    if (!dateInput) return false;
    const d = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)
        ? new Date(dateInput.substring(0, 10) + 'T00:00:00')
        : new Date(dateInput);
    if (isNaN(d.getTime()) || d.getDay() !== 6) return false;

    const occurrence = Math.ceil(d.getDate() / 7); // 1st, 2nd, 3rd... Saturday of the month
    return occurrence === 1 || occurrence === 3;
}

function parseTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
}

function minutesToTimeString(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function normalizeTime(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
}

function validateBookingTimes(startTime, endTime, { isAdmin = false } = {}) {
    const start = normalizeTime(startTime);
    const end = normalizeTime(endTime);

    if (!start || !end) {
        return { valid: false, message: 'Start time and end time are required' };
    }

    const startMin = parseTimeToMinutes(start);
    const endMin = parseTimeToMinutes(end);

    if (startMin >= endMin) {
        return { valid: false, message: 'End time must be after start time' };
    }

const durationHours = (endMin - startMin) / 60;
    const openMin = BOOKING_START_HOUR * 60;
    const closeMin = BOOKING_END_HOUR * 60;

    // Enforce operating hours for ALL roles including admins
    if (startMin < openMin || endMin > closeMin) {
        return { valid: false, message: 'Bookings are only allowed between 10:00 AM and 7:00 PM' };
    }

    // Maximum duration of 2 hours only applies to non-admin (student) bookings
    if (!isAdmin && durationHours > MAX_DURATION_HOURS) {
        return { valid: false, message: 'Maximum booking duration is 2 hours' };
    }

    return { valid: true, startTime: start, endTime: end, durationHours };
}

function timesOverlap(startA, endA, startB, endB) {
    const aStart = parseTimeToMinutes(normalizeTime(startA));
    const aEnd = parseTimeToMinutes(normalizeTime(endA));
    const bStart = parseTimeToMinutes(normalizeTime(startB));
    const bEnd = parseTimeToMinutes(normalizeTime(endB));
    return aStart < bEnd && aEnd > bStart;
}

function generateHourlySlots() {
    const slots = [];
    for (let hour = BOOKING_START_HOUR; hour < BOOKING_END_HOUR; hour++) {
        slots.push({
            start: minutesToTimeString(hour * 60),
            end: minutesToTimeString((hour + 1) * 60)
        });
    }
    return slots;
}

module.exports = {
    BOOKING_START_HOUR,
    BOOKING_END_HOUR,
    MAX_DURATION_HOURS,
    BLOCKED_SATURDAY_MESSAGE,
    parseTimeToMinutes,
    minutesToTimeString,
    normalizeTime,
    validateBookingTimes,
    timesOverlap,
    generateHourlySlots,
    isBlockedSaturday
};
