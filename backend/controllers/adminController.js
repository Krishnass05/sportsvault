const db = require('../db');
const bcrypt = require('bcryptjs');

// Import student records from CSV (bulk)
exports.importStudentsBulk = async (req, res) => {
    try {
        const { students } = req.body;

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: 'No student records provided' });
        }

        // Only SAP ID column is required from the CSV.
        // Name and School are collected during student registration.
        const requiredHeaders = ['SAP ID'];
        const first = students[0];
        const hasValidShape = first && (
            first['SAP ID'] !== undefined || first.sap_id !== undefined
        );

        if (!hasValidShape) {
            return res.status(400).json({
                message: `Invalid CSV format. Required column: ${requiredHeaders.join(', ')}`
            });
        }

        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (const row of students) {
            const sapId = (row['SAP ID'] || row.sap_id || '').trim();

            if (!sapId) {
                errors.push(`Skipped row with missing data: ${sapId || 'unknown'}`);
                skipped++;
                continue;
            }

            const { rows: existing } = await db.query(
                'SELECT * FROM student_ids WHERE student_id = $1',
                [sapId]
            );

            if (existing.length > 0) {
                skipped++;
                continue;
            }

            // Name and school are populated later during student registration
            await db.query(
                'INSERT INTO student_ids (student_id, name, school) VALUES ($1, NULL, NULL)',
                [sapId]
            );
            imported++;
        }

        res.json({
            message: `Import complete: ${imported} imported, ${skipped} skipped`,
            imported,
            skipped,
            errors: errors.slice(0, 10)
        });
    } catch (error) {
        console.error('Import students error:', error);
        res.status(500).json({ message: 'Server error during import' });
    }
};

// Create new student ID
exports.createStudentId = async (req, res) => {
    try {
        const { student_id, name, school } = req.body;

        if (!student_id) {
            return res.status(400).json({ message: 'SAP ID is required' });
        }

        const { rows: existingRows } = await db.query(
            'SELECT * FROM student_ids WHERE student_id = $1',
            [student_id]
        );

        if (existingRows.length > 0) {
            return res.status(400).json({ message: 'SAP ID already exists' });
        }

        const result = await db.query(
            'INSERT INTO student_ids (student_id, name, school) VALUES ($1, $2, $3) RETURNING id',
            [student_id, name || '', school || '']
        );

        res.status(201).json({
            message: 'Student ID created successfully',
            id: result.rows[0].id,
            student_id
        });
    } catch (error) {
        console.error('Create student ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all student IDs
exports.getStudentIds = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT si.*, u.name as registered_name, u.email FROM student_ids si LEFT JOIN users u ON si.student_id = u.student_id ORDER BY si.created_at DESC'
        );

        res.json({ studentIds: rows });
    } catch (error) {
        console.error('Get student IDs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete student ID
exports.deleteStudentId = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if student ID is registered
        const { rows } = await db.query(
            'SELECT * FROM student_ids WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Student ID not found' });
        }

        if (rows[0].is_registered) {
            return res.status(400).json({ message: 'Cannot delete registered Student ID' });
        }

        await db.query('DELETE FROM student_ids WHERE id = $1', [id]);

        res.json({ message: 'Student ID deleted successfully' });
    } catch (error) {
        console.error('Delete student ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get dashboard statistics (venue booking related)
exports.getDashboardStats = async (req, res) => {
    try {
        // Total bookings count
        const { rows: bookingRows } = await db.query(
            'SELECT COUNT(*) as total FROM bookings'
        );

        // Confirmed bookings count
        const { rows: confirmedRows } = await db.query(
            "SELECT COUNT(*) as total FROM bookings WHERE status = 'confirmed'"
        );

        // Total students
        const { rows: studentRows } = await db.query(
            'SELECT COUNT(*) as total FROM users WHERE role = $1',
            ['student']
        );

        // Total active venues
        const { rows: venueRows } = await db.query(
            'SELECT COUNT(*) as total FROM venues WHERE is_active = TRUE'
        );

        res.json({
            totalBookings: Number(bookingRows[0].total),
            confirmedBookings: Number(confirmedRows[0].total),
            totalStudents: Number(studentRows[0].total),
            activeVenues: Number(venueRows[0].total)
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create admin user (for initial setup)
exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if admin already exists
        const { rows: existingRows } = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existingRows.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, email, hashedPassword, 'admin']
        );

        res.status(201).json({
            message: 'Admin created successfully',
            userId: result.rows[0].id
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, email, role, student_id, created_at FROM users ORDER BY name'
        );
        res.json({ users: rows });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

