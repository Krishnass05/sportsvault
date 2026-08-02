
const db = require('../db');
const {
    validateBookingTimes,
    timesOverlap,
    generateHourlySlots,
    normalizeTime,
    parseTimeToMinutes,
    BOOKING_START_HOUR,
    BOOKING_END_HOUR
} = require('../utils/bookingValidation');
const emailService = require('../services/emailService');

async function checkVenueAvailable(venueId, isStudent = false) {
    const [rows] = await db.execute('SELECT * FROM venues WHERE id = ?', [venueId]);
    if (rows.length === 0) return { found: false };
    if (isStudent && !rows[0].is_active) return { found: true, active: false, venue: rows[0] };
    return { found: true, active: true, venue: rows[0] };
}

async function findConflictingBookings(venueId, bookingDate, startTime, endTime, excludeId = null) {
    let query = `
        SELECT * FROM bookings
        WHERE venue_id = ? AND booking_date = ? AND status = 'confirmed'
        AND start_time < ? AND end_time > ?
    `;
    const params = [venueId, bookingDate, endTime, startTime];

    if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
    }

    const [rows] = await db.execute(query, params);
    return rows;
}

exports.getAllBookings = async (req, res) => {
    try {
        const { month } = req.query;
        let query = `
            SELECT b.*, v.name as venue_name, v.location, u.name as user_name, u.email as user_email
            FROM bookings b
            JOIN venues v ON b.venue_id = v.id
            JOIN users u ON b.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (req.user.role === 'student') {
            query += ' AND b.user_id = ?';
            params.push(req.user.id);
        } else if (req.user.role === 'admin' && req.query.user_id) {
            query += ' AND b.user_id = ?';
            params.push(req.query.user_id);
        }

        if (month && /^\d{4}-\d{2}$/.test(month)) {
            query += ' AND DATE_FORMAT(b.booking_date, "%Y-%m") = ?';
            params.push(month);
        }

        query += ' ORDER BY b.booking_date DESC, b.start_time DESC';

        const [rows] = await db.execute(query, params);
        res.json({ bookings: rows });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createBooking = async (req, res) => {
    try {
        const { venue_id, booking_date, start_time, end_time, purpose, approx_students } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!venue_id || !booking_date || !start_time || !end_time) {
            return res.status(400).json({ message: 'Venue, date, and time are required' });
        }

        const venueCheck = await checkVenueAvailable(venue_id, !isAdmin);
        if (!venueCheck.found) {
            return res.status(404).json({ message: 'Venue not found' });
        }
        if (!venueCheck.active) {
            return res.status(400).json({ message: 'This venue is currently unavailable for booking' });
        }

        const timeValidation = validateBookingTimes(start_time, end_time, { isAdmin });
        if (!timeValidation.valid) {
            return res.status(400).json({ message: timeValidation.message });
        }

        const bookingDate = new Date(booking_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (bookingDate < today && !isAdmin) {
            return res.status(400).json({ message: 'Cannot book for past dates' });
        }

        const conflicts = await findConflictingBookings(
            venue_id,
            booking_date,
            timeValidation.startTime,
            timeValidation.endTime
        );

        if (conflicts.length > 0) {
            return res.status(409).json({ message: 'This time slot is already booked. Please choose another slot.' });
        }

        const bookingType = isAdmin ? (req.body.booking_type || 'admin') : 'student';
        const validTypes = ['student', 'admin', 'event'];
        const finalType = validTypes.includes(bookingType) ? bookingType : (isAdmin ? 'admin' : 'student');

        const [result] = await db.execute(
            `INSERT INTO bookings (venue_id, user_id, booking_date, start_time, end_time, purpose, approx_students, status, booking_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
            [venue_id, userId, booking_date, timeValidation.startTime, timeValidation.endTime, purpose || '', approx_students ? parseInt(approx_students) || null : null, finalType]
        );

        // --- Send email notification to the student (or the booking user) ---
        try {
            // Fetch the recipient user (the user the booking belongs to)
            const [userRows] = await db.execute(
                'SELECT id, name, email FROM users WHERE id = ?',
                [userId]
            );

            // Fetch the venue name for the email
            const [venueRows] = await db.execute(
                'SELECT name FROM venues WHERE id = ?',
                [venue_id]
            );

            const recipient = userRows[0];
            const venueName = venueRows[0] ? venueRows[0].name : 'Venue';

            if (recipient && recipient.email) {
                await emailService.sendBookingConfirmation(
                    recipient.email,
                    recipient.name,
                    {
                        venueName,
                        bookingDate,
                        startTime: timeValidation.startTime,
                        endTime: timeValidation.endTime,
                        purpose,
                        bookingType: finalType
                    }
                );
            }
        } catch (emailError) {
            // Email failure should not fail the booking creation
            console.error('Failed to send booking confirmation email:', emailError.message);
        }

        res.status(201).json({
            message: 'Booking confirmed successfully',
            bookingId: result.insertId,
            status: 'confirmed'
        });
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [rows] = await db.execute('SELECT * FROM bookings WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = rows[0];

        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        if (req.user.role !== 'admin' && booking.user_id !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await db.execute('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', id]);

        // --- Send email notification about the cancellation ---
        try {
            // Fetch the booking user's info
            const [userRows] = await db.execute(
                'SELECT id, name, email FROM users WHERE id = ?',
                [booking.user_id]
            );

            // Fetch the venue name
            const [venueRows] = await db.execute(
                'SELECT name FROM venues WHERE id = ?',
                [booking.venue_id]
            );

            const recipient = userRows[0];
            const venueName = venueRows[0] ? venueRows[0].name : 'Venue';

            if (recipient && recipient.email) {
                await emailService.sendBookingCancellation(
                    recipient.email,
                    recipient.name,
                    {
                        venueName,
                        bookingDate: booking.booking_date,
                        startTime: booking.start_time,
                        endTime: booking.end_time,
                        purpose: booking.purpose
                    }
                );
            }
        } catch (emailError) {
            // Email failure should not fail the cancellation
            console.error('Failed to send booking cancellation email:', emailError.message);
        }

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAvailableSlots = async (req, res) => {
    try {
        const { venue_id, date } = req.query;

        if (!venue_id || !date) {
            return res.status(400).json({ message: 'Venue ID and date are required' });
        }

        const venueCheck = await checkVenueAvailable(venue_id, true);
        if (!venueCheck.found) {
            return res.status(404).json({ message: 'Venue not found' });
        }
        if (!venueCheck.active) {
            return res.json({
                slots: [],
                operatingHours: { start: '10:00', end: '19:00' },
                venueInactive: true
            });
        }

        const [bookings] = await db.execute(
            `SELECT start_time, end_time, booking_type, purpose FROM bookings
             WHERE venue_id = ? AND booking_date = ? AND status = 'confirmed'`,
            [venue_id, date]
        );

        const hourlySlots = generateHourlySlots();
        const slots = hourlySlots.map(slot => {
            const overlapping = bookings.find(b =>
                timesOverlap(slot.start, slot.end, b.start_time, b.end_time)
            );

            return {
                start: slot.start.substring(0, 5),
                end: slot.end.substring(0, 5),
                available: !overlapping,
                reason: overlapping
                    ? (overlapping.booking_type === 'event'
                        ? 'Reserved for event'
                        : overlapping.booking_type === 'admin'
                            ? 'Reserved by administration'
                            : 'Booked')
                    : null
            };
        });

        res.json({
            slots,
            bookedSlots: bookings.map(b => ({
                start_time: b.start_time,
                end_time: b.end_time,
                booking_type: b.booking_type,
                purpose: b.purpose
            })),
            operatingHours: {
                start: `${String(BOOKING_START_HOUR).padStart(2, '0')}:00`,
                end: `${String(BOOKING_END_HOUR).padStart(2, '0')}:00`
            }
        });
    } catch (error) {
        console.error('Get available slots error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getBookingReports = async (req, res) => {
    try {
        const { month } = req.query;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ message: 'Valid month parameter required (YYYY-MM)' });
        }

        const [bookings] = await db.execute(
            `SELECT b.*, v.name as venue_name, v.location, u.name as user_name, u.email as user_email
             FROM bookings b
             JOIN venues v ON b.venue_id = v.id
             JOIN users u ON b.user_id = u.id
             WHERE DATE_FORMAT(b.booking_date, '%Y-%m') = ?
             ORDER BY b.booking_date, b.start_time`,
            [month]
        );

        const confirmed = bookings.filter(b => b.status === 'confirmed');
        const cancelled = bookings.filter(b => b.status === 'cancelled');

        const byVenue = {};
        confirmed.forEach(b => {
            byVenue[b.venue_name] = (byVenue[b.venue_name] || 0) + 1;
        });

        const byType = { student: 0, admin: 0, event: 0 };
        confirmed.forEach(b => {
            const type = b.booking_type || 'student';
            byType[type] = (byType[type] || 0) + 1;
        });

        res.json({
            month,
            totalBookings: bookings.length,
            confirmedBookings: confirmed.length,
            cancelledBookings: cancelled.length,
            byVenue,
            byType,
            bookings
        });
    } catch (error) {
        console.error('Get booking reports error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getVenues = async (req, res) => {
    try {
        let query = 'SELECT * FROM venues';
        if (req.user.role === 'student') {
            query += ' WHERE is_active = TRUE';
        }
        query += ' ORDER BY name';

        const [rows] = await db.execute(query);
        res.json({ venues: rows });
    } catch (error) {
        console.error('Get venues error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.importBooking = async (req, res) => {
    try {
        const { user_name, venue_name, booking_date, start_time, end_time, purpose, booking_type, approx_students } = req.body;

        const [userRows] = await db.execute('SELECT id FROM users WHERE name = ?', [user_name]);
        if (userRows.length === 0) {
            return res.status(400).json({ message: `User "${user_name}" not found` });
        }

        const [venueRows] = await db.execute('SELECT id FROM venues WHERE name = ?', [venue_name]);
        if (venueRows.length === 0) {
            return res.status(400).json({ message: `Venue "${venue_name}" not found` });
        }

        const timeValidation = validateBookingTimes(start_time, end_time, { isAdmin: true });
        if (!timeValidation.valid) {
            return res.status(400).json({ message: timeValidation.message });
        }

        const conflicts = await findConflictingBookings(
            venueRows[0].id,
            booking_date,
            timeValidation.startTime,
            timeValidation.endTime
        );

        if (conflicts.length > 0) {
            return res.status(409).json({ message: 'Conflicting booking exists for this slot' });
        }

        await db.execute(
            `INSERT INTO bookings (venue_id, user_id, booking_date, start_time, end_time, purpose, approx_students, status, booking_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
            [venueRows[0].id, userRows[0].id, booking_date, timeValidation.startTime, timeValidation.endTime, purpose || '', approx_students ? parseInt(approx_students) || null : null, booking_type || 'admin']
        );

        res.status(201).json({ message: 'Booking imported successfully' });
    } catch (error) {
        console.error('Import booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
