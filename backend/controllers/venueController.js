const db = require('../db');

exports.getAllVenues = async (req, res) => {
    try {
        let query = 'SELECT * FROM venues';
        const params = [];

        if (req.user.role === 'student') {
            query += ' WHERE is_active = TRUE';
        }

        query += ' ORDER BY name';

        const [rows] = await db.execute(query, params);
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

        const [result] = await db.execute(
            'INSERT INTO venues (name, location, capacity, description, is_active) VALUES (?, ?, ?, ?, TRUE)',
            [name, location || '', capacity || null, description || '']
        );

        res.status(201).json({
            message: 'Venue created successfully',
            venueId: result.insertId
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

        const [rows] = await db.execute('SELECT * FROM venues WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Venue not found' });
        }

        const venue = rows[0];

        await db.execute(
            'UPDATE venues SET name = ?, location = ?, capacity = ?, description = ?, is_active = ? WHERE id = ?',
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

        const [rows] = await db.execute('SELECT * FROM venues WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Venue not found' });
        }

        await db.execute('UPDATE venues SET is_active = ? WHERE id = ?', [is_active, id]);

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

        const [activeBookings] = await db.execute(
            `SELECT COUNT(*) as count FROM bookings
             WHERE venue_id = ? AND status = 'confirmed'
             AND (booking_date > CURDATE() OR (booking_date = CURDATE() AND end_time > CURTIME()))`,
            [id]
        );

        if (activeBookings[0].count > 0) {
            return res.status(400).json({
                message: 'Cannot delete venue with upcoming confirmed bookings. Disable it instead.'
            });
        }

        await db.execute('DELETE FROM venues WHERE id = ?', [id]);
        res.json({ message: 'Venue deleted successfully' });
    } catch (error) {
        console.error('Delete venue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
