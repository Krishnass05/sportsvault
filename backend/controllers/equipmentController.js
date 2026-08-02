const db = require('../db');

// Get all equipment
exports.getAllEquipment = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM equipment ORDER BY category, name'
        );

        res.json({ equipment: rows });
    } catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get equipment by ID
exports.getEquipmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(
            'SELECT * FROM equipment WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        res.json({ equipment: rows[0] });
    } catch (error) {
        console.error('Get equipment by ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create new equipment (Admin only)
exports.createEquipment = async (req, res) => {
    try {
        const { name, category, description, total_quantity } = req.body;

        if (!name || !category || !total_quantity) {
            return res.status(400).json({ message: 'Name, category, and quantity are required' });
        }

        const result = await db.query(
            'INSERT INTO equipment (name, category, description, total_quantity, available_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, category, description || '', total_quantity, total_quantity]
        );

        res.status(201).json({
            message: 'Equipment added successfully',
            equipmentId: result.rows[0].id
        });
    } catch (error) {
        console.error('Create equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update equipment (Admin only)
exports.updateEquipment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description, total_quantity, status } = req.body;

        // Get current equipment data
        const { rows } = await db.query(
            'SELECT * FROM equipment WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        const equipment = rows[0];

        // Calculate new available quantity if total_quantity changed
        let available_quantity = equipment.available_quantity;
        if (total_quantity !== undefined && total_quantity !== equipment.total_quantity) {
            const issued = equipment.total_quantity - equipment.available_quantity;
            available_quantity = Math.max(0, total_quantity - issued);
        }

        await db.query(
            'UPDATE equipment SET name = $1, category = $2, description = $3, total_quantity = $4, available_quantity = $5, status = $6 WHERE id = $7',
            [
                name || equipment.name,
                category || equipment.category,
                description !== undefined ? description : equipment.description,
                total_quantity || equipment.total_quantity,
                available_quantity,
                status || equipment.status,
                id
            ]
        );

        res.json({ message: 'Equipment updated successfully' });
    } catch (error) {
        console.error('Update equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete equipment (Admin only)
exports.deleteEquipment = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if equipment has active issues
        const { rows: issueRows } = await db.query(
            'SELECT * FROM equipment_issues WHERE equipment_id = $1 AND status = $2',
            [id, 'issued']
        );

        if (issueRows.length > 0) {
            return res.status(400).json({ message: 'Cannot delete equipment with active issues' });
        }

        await db.query('DELETE FROM equipment WHERE id = $1', [id]);

        res.json({ message: 'Equipment deleted successfully' });
    } catch (error) {
        console.error('Delete equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Issue equipment (Student only)
exports.issueEquipment = async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if equipment exists and is available
        const { rows } = await client.query(
            'SELECT * FROM equipment WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        const equipment = rows[0];

        if (equipment.available_quantity <= 0) {
            return res.status(400).json({ message: 'Equipment not available' });
        }

        // Check how many of this specific equipment the user has already issued
        const { rows: existingIssue } = await client.query(
            'SELECT * FROM equipment_issues WHERE equipment_id = $1 AND user_id = $2 AND status = $3',
            [id, userId, 'issued']
        );

        if (existingIssue.length >= 2) {
            return res.status(400).json({ message: 'You can only issue a maximum of 2 items of the same equipment type' });
        }

        // Start transaction
        await client.query('BEGIN');

        try {
            // Create issue record
            await client.query(
                'INSERT INTO equipment_issues (equipment_id, user_id) VALUES ($1, $2)',
                [id, userId]
            );

            // Update equipment availability
            await client.query(
                'UPDATE equipment SET available_quantity = available_quantity - 1, status = CASE WHEN available_quantity - 1 = 0 THEN $1 ELSE $2 END WHERE id = $3',
                ['issued', 'available', id]
            );

            await client.query('COMMIT');

            res.json({ message: 'Equipment issued successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Issue equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Return equipment (Student only)
exports.returnEquipment = async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user has issued this equipment
        const { rows: issueRows } = await client.query(
            'SELECT * FROM equipment_issues WHERE equipment_id = $1 AND user_id = $2 AND status = $3',
            [id, userId, 'issued']
        );

        if (issueRows.length === 0) {
            return res.status(400).json({ message: 'You have not issued this equipment' });
        }

        const issueId = issueRows[0].id;

        // Start transaction
        await client.query('BEGIN');

        try {
            // Update issue record
            await client.query(
                'UPDATE equipment_issues SET status = $1, return_date = NOW() WHERE id = $2',
                ['returned', issueId]
            );

            // Update equipment availability
            await client.query(
                'UPDATE equipment SET available_quantity = available_quantity + 1, status = $1 WHERE id = $2',
                ['available', id]
            );

            await client.query('COMMIT');

            res.json({ message: 'Equipment returned successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Return equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user's issued equipment
exports.getMyEquipment = async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows } = await db.query(
            `SELECT ei.*, e.name, e.category, e.description 
             FROM equipment_issues ei 
             JOIN equipment e ON ei.equipment_id = e.id 
             WHERE ei.user_id = $1 AND ei.status = $2`,
            [userId, 'issued']
        );

        res.json({ equipment: rows });
    } catch (error) {
        console.error('Get my equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get equipment statistics (for dashboard)
exports.getEquipmentStats = async (req, res) => {
    try {
        // Total equipment count
        const { rows: equipmentRows } = await db.query(
            'SELECT COUNT(*) as total FROM equipment'
        );

        // Available equipment count
        const { rows: availableRows } = await db.query(
            'SELECT COALESCE(SUM(available_quantity), 0) as available FROM equipment'
        );

        res.json({
            totalEquipment: Number(equipmentRows[0].total),
            availableEquipment: Number(availableRows[0].available)
        });
    } catch (error) {
        console.error('Get equipment stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get equipment issues history (admin only)
exports.getEquipmentIssuesHistory = async (req, res) => {
    try {
        console.log('Getting equipment issues history for admin:', req.user.id);
        const { rows } = await db.query(
            `SELECT 
                ei.id,
                ei.issue_date,
                ei.return_date,
                ei.status,
                e.name as equipment_name,
                e.category,
                u.name as student_name,
                u.email as student_email
             FROM equipment_issues ei
             JOIN equipment e ON ei.equipment_id = e.id
             JOIN users u ON ei.user_id = u.id
             ORDER BY ei.issue_date DESC`
        );
        console.log('Equipment issues found:', rows.length);
        res.json({ issues: rows });
    } catch (error) {
        console.error('Get equipment issues history error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update equipment issue (admin only)
exports.updateEquipmentIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['issued', 'returned'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const { rows } = await db.query(
            'SELECT * FROM equipment_issues WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Equipment issue not found' });
        }

        const returnDate = status === 'returned' ? new Date() : null;

        await db.query(
            'UPDATE equipment_issues SET status = $1, return_date = $2 WHERE id = $3',
            [status, returnDate, id]
        );

        res.json({ message: 'Equipment issue updated successfully' });
    } catch (error) {
        console.error('Update equipment issue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete equipment issue (admin only)
exports.deleteEquipmentIssue = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM equipment_issues WHERE id = $1', [id]);
        res.json({ message: 'Equipment issue deleted successfully' });
    } catch (error) {
        console.error('Delete equipment issue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Import equipment issue from CSV (admin only)
exports.importEquipmentIssue = async (req, res) => {
    try {
        const { student_name, equipment_name, category, issue_date, return_date, status } = req.body;

        // Find student by name
        const { rows: studentRows } = await db.query(
            'SELECT id FROM users WHERE name = $1 AND role = $2',
            [student_name, 'student']
        );

        if (studentRows.length === 0) {
            return res.status(400).json({ message: `Student "${student_name}" not found` });
        }

        // Find equipment by name
        const { rows: equipmentRows } = await db.query(
            'SELECT id FROM equipment WHERE name = $1',
            [equipment_name]
        );

        if (equipmentRows.length === 0) {
            return res.status(400).json({ message: `Equipment "${equipment_name}" not found` });
        }

        await db.query(
            'INSERT INTO equipment_issues (equipment_id, user_id, issue_date, return_date, status) VALUES ($1, $2, $3, $4, $5)',
            [equipmentRows[0].id, studentRows[0].id, issue_date, return_date || null, status || 'issued']
        );

        res.status(201).json({ message: 'Equipment issue imported successfully' });
    } catch (error) {
        console.error('Import equipment issue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

