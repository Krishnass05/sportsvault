const db = require('../db');

// Get all equipment
exports.getAllEquipment = async (req, res) => {
    try {
        const [rows] = await db.execute(
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

        const [rows] = await db.execute(
            'SELECT * FROM equipment WHERE id = ?',
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

        const [result] = await db.execute(
            'INSERT INTO equipment (name, category, description, total_quantity, available_quantity) VALUES (?, ?, ?, ?, ?)',
            [name, category, description || '', total_quantity, total_quantity]
        );

        res.status(201).json({
            message: 'Equipment added successfully',
            equipmentId: result.insertId
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
        const [rows] = await db.execute(
            'SELECT * FROM equipment WHERE id = ?',
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

        await db.execute(
            'UPDATE equipment SET name = ?, category = ?, description = ?, total_quantity = ?, available_quantity = ?, status = ? WHERE id = ?',
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
        const [issueRows] = await db.execute(
            'SELECT * FROM equipment_issues WHERE equipment_id = ? AND status = ?',
            [id, 'issued']
        );

        if (issueRows.length > 0) {
            return res.status(400).json({ message: 'Cannot delete equipment with active issues' });
        }

        await db.execute('DELETE FROM equipment WHERE id = ?', [id]);

        res.json({ message: 'Equipment deleted successfully' });
    } catch (error) {
        console.error('Delete equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Issue equipment (Student only)
exports.issueEquipment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if equipment exists and is available
        const [rows] = await db.execute(
            'SELECT * FROM equipment WHERE id = ?',
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
        const [existingIssue] = await db.execute(
            'SELECT * FROM equipment_issues WHERE equipment_id = ? AND user_id = ? AND status = ?',
            [id, userId, 'issued']
        );

        if (existingIssue.length >= 2) {
            return res.status(400).json({ message: 'You can only issue a maximum of 2 items of the same equipment type' });
        }

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Create issue record
            await connection.execute(
                'INSERT INTO equipment_issues (equipment_id, user_id) VALUES (?, ?)',
                [id, userId]
            );

            // Update equipment availability
            await connection.execute(
                'UPDATE equipment SET available_quantity = available_quantity - 1, status = CASE WHEN available_quantity - 1 = 0 THEN ? ELSE ? END WHERE id = ?',
                ['issued', 'available', id]
            );

            await connection.commit();
            connection.release();

            res.json({ message: 'Equipment issued successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Issue equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Return equipment (Student only)
exports.returnEquipment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user has issued this equipment
        const [issueRows] = await db.execute(
            'SELECT * FROM equipment_issues WHERE equipment_id = ? AND user_id = ? AND status = ?',
            [id, userId, 'issued']
        );

        if (issueRows.length === 0) {
            return res.status(400).json({ message: 'You have not issued this equipment' });
        }

        const issueId = issueRows[0].id;

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update issue record
            await connection.execute(
                'UPDATE equipment_issues SET status = ?, return_date = NOW() WHERE id = ?',
                ['returned', issueId]
            );

            // Update equipment availability
            await connection.execute(
                'UPDATE equipment SET available_quantity = available_quantity + 1, status = ? WHERE id = ?',
                ['available', id]
            );

            await connection.commit();
            connection.release();

            res.json({ message: 'Equipment returned successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
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

        const [rows] = await db.execute(
            `SELECT ei.*, e.name, e.category, e.description 
             FROM equipment_issues ei 
             JOIN equipment e ON ei.equipment_id = e.id 
             WHERE ei.user_id = ? AND ei.status = ?`,
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
        const [equipmentRows] = await db.execute(
            'SELECT COUNT(*) as total FROM equipment'
        );

        // Available equipment count
        const [availableRows] = await db.execute(
            'SELECT SUM(available_quantity) as available FROM equipment'
        );

        res.json({
            totalEquipment: equipmentRows[0].total,
            availableEquipment: availableRows[0].available || 0
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
        const [rows] = await db.execute(
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

        const [rows] = await db.execute(
            'SELECT * FROM equipment_issues WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Equipment issue not found' });
        }

        const returnDate = status === 'returned' ? new Date() : null;

        await db.execute(
            'UPDATE equipment_issues SET status = ?, return_date = ? WHERE id = ?',
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

        await db.execute('DELETE FROM equipment_issues WHERE id = ?', [id]);
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
        const [studentRows] = await db.execute(
            'SELECT id FROM users WHERE name = ? AND role = ?',
            [student_name, 'student']
        );

        if (studentRows.length === 0) {
            return res.status(400).json({ message: `Student "${student_name}" not found` });
        }

        // Find equipment by name
        const [equipmentRows] = await db.execute(
            'SELECT id FROM equipment WHERE name = ?',
            [equipment_name]
        );

        if (equipmentRows.length === 0) {
            return res.status(400).json({ message: `Equipment "${equipment_name}" not found` });
        }

        await db.execute(
            'INSERT INTO equipment_issues (equipment_id, user_id, issue_date, return_date, status) VALUES (?, ?, ?, ?, ?)',
            [equipmentRows[0].id, studentRows[0].id, issue_date, return_date || null, status || 'issued']
        );

        res.status(201).json({ message: 'Equipment issue imported successfully' });
    } catch (error) {
        console.error('Import equipment issue error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
