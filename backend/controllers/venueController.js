const db = require('../db');

exports.getAllVenues = async (req, res) => {
    try {
        let query = 'SELECT * FROM venues';
        const params = [];

        if (req.user.role === 'student') {
            query += ' WHERE is_active = TRUE';
        }

        query += ' ORDER BY name';

        const { rows } = await db.query(query, params);
        res.json({ venues: rows });
    } catch (error) {
        console.error('Get venues error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createVenue = async (req, res) => {
    try {
        const { name, location, capacity, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Venue name is required' });
        }

        const result = await db.query(
            'INSERT INTO venues (name, location, capacity, description, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id',
            [name, location || '', capacity || null, description || '']
        );

        res.status(201).json({
            message: 'Venue created successfully',
            venueId: result.rows[0].id
        });
    } catch (error) {
        console.error('Create venue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateVenue = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, capacity, description, is_active } = req.body;

        const { rows } = await db.query('SELECT * FROM venues WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Venue not found' });
        }

        const venue = rows[0];

        await db.query(
            'UPDATE venues SET name = $1, location = $2, capacity = $3, description = $4, is_active = $5 WHERE id = $6',
            [
                name || venue.name,
                location !== undefined ? location : venue.location,
                capacity !== undefined ? capacity : venue.capacity,
                description !== undefined ? description : venue.description,
                is_active !== undefined ? is_active : venue.is_active,
                id
            ]
        );

        res.json({ message: 'Venue updated successfully' });
    } catch (error) {
        console.error('Update venue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.toggleVenueStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ message: 'is_active must be a boolean' });
        }

        const { rows } = await db.query('SELECT * FROM venues WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Venue not found' });
        }

        await db.query('UPDATE venues SET is_active = $1 WHERE id = $2', [is_active, id]);

        res.json({
            message: `Venue ${is_active ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        console.error('Toggle venue status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteVenue = async (req, res) => {
    try {
        const { id } = req.params;

        const { rows: activeBookings } = await db.query(
            `SELECT COUNT(*) as count FROM bookings
             WHERE venue_id = $1 AND status = 'confirmed'
             AND (booking_date > CURRENT_DATE OR (booking_date = CURRENT_DATE AND end_time > CURRENT_TIME))`,
            [id]
        );

        if (Number(activeBookings[0].count) > 0) {
            return res.status(400).json({
                message: 'Cannot delete venue with upcoming confirmed bookings. Disable it instead.'
            });
        }

        await db.query('DELETE FROM venues WHERE id = $1', [id]);
        res.json({ message: 'Venue deleted successfully' });
    } catch (error) {
        console.error('Delete venue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

