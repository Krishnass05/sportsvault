const db = require('../db');

// Get all maintenance records
exports.getAllMaintenance = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT m.*, e.name as equipment_name, e.category, u.name as reported_by_name
             FROM maintenance m
             JOIN equipment e ON m.equipment_id = e.id
             JOIN users u ON m.reported_by = u.id
             ORDER BY m.reported_date DESC`
        );

        res.json({ maintenance: rows });
    } catch (error) {
        console.error('Get maintenance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create maintenance record (Admin only)
exports.createMaintenance = async (req, res) => {
    try {
        const { equipment_id, issue_description, repair_cost, notes } = req.body;
        const reportedBy = req.user.id;

        if (!equipment_id || !issue_description) {
            return res.status(400).json({ message: 'Equipment and issue description are required' });
        }

        // Check if equipment exists
        const [equipmentRows] = await db.execute(
            'SELECT * FROM equipment WHERE id = ?',
            [equipment_id]
        );

        if (equipmentRows.length === 0) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Create maintenance record
            const [result] = await connection.execute(
                'INSERT INTO maintenance (equipment_id, issue_description, reported_by, repair_cost, notes) VALUES (?, ?, ?, ?, ?)',
                [equipment_id, issue_description, reportedBy, repair_cost || 0, notes || '']
            );

            // Update equipment status to maintenance
            await connection.execute(
                'UPDATE equipment SET status = ? WHERE id = ?',
                ['maintenance', equipment_id]
            );

            await connection.commit();
            connection.release();

            res.status(201).json({
                message: 'Maintenance record created successfully',
                maintenanceId: result.insertId
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Create maintenance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update maintenance status (Admin only)
exports.updateMaintenanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, repair_cost } = req.body;

        if (!['reported', 'in_progress', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM maintenance WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Maintenance record not found' });
        }

        const maintenance = rows[0];

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            let completedDate = null;
            if (status === 'completed') {
                completedDate = new Date();
            }

            await connection.execute(
                'UPDATE maintenance SET status = ?, notes = ?, repair_cost = ?, completed_date = ? WHERE id = ?',
                [status, notes || maintenance.notes, repair_cost !== undefined ? repair_cost : maintenance.repair_cost, completedDate, id]
            );

            // If maintenance is completed or cancelled, update equipment status back to available
            if (status === 'completed' || status === 'cancelled') {
                await connection.execute(
                    'UPDATE equipment SET status = ? WHERE id = ?',
                    ['available', maintenance.equipment_id]
                );
            }

            await connection.commit();
            connection.release();

            res.json({ message: 'Maintenance status updated successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Update maintenance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete maintenance record (Admin only)
exports.deleteMaintenance = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.execute(
            'SELECT * FROM maintenance WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Maintenance record not found' });
        }

        await db.execute('DELETE FROM maintenance WHERE id = ?', [id]);

        res.json({ message: 'Maintenance record deleted successfully' });
    } catch (error) {
        console.error('Delete maintenance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get maintenance statistics
exports.getMaintenanceStats = async (req, res) => {
    try {
        // Count by status
        const [statusRows] = await db.execute(
            'SELECT status, COUNT(*) as count FROM maintenance GROUP BY status'
        );

        // Total repair cost
        const [costRows] = await db.execute(
            'SELECT SUM(repair_cost) as total_cost FROM maintenance WHERE status = ?',
            ['completed']
        );

        // Recent maintenance (last 30 days)
        const [recentRows] = await db.execute(
            'SELECT COUNT(*) as count FROM maintenance WHERE reported_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
        );

        res.json({
            statusCounts: statusRows,
            totalRepairCost: costRows[0].total_cost || 0,
            recentCount: recentRows[0].count
        });
    } catch (error) {
        console.error('Get maintenance stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Import maintenance from CSV (admin only)
exports.importMaintenance = async (req, res) => {
    try {
        const { equipment_name, issue_description, reported_by_name, reported_date, completed_date, repair_cost, status } = req.body;

        // Find equipment by name
        const [equipmentRows] = await db.execute(
            'SELECT id FROM equipment WHERE name = ?',
            [equipment_name]
        );

        if (equipmentRows.length === 0) {
            return res.status(400).json({ message: `Equipment "${equipment_name}" not found` });
        }

        // Find user by name (reporter)
        const [userRows] = await db.execute(
            'SELECT id FROM users WHERE name = ?',
            [reported_by_name]
        );

        const reportedById = userRows.length > 0 ? userRows[0].id : req.user.id;

        await db.execute(
            'INSERT INTO maintenance (equipment_id, issue_description, reported_by, reported_date, completed_date, repair_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [equipmentRows[0].id, issue_description, reportedById, reported_date, completed_date || null, repair_cost || 0, status || 'reported']
        );

        res.status(201).json({ message: 'Maintenance record imported successfully' });
    } catch (error) {
        console.error('Import maintenance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
