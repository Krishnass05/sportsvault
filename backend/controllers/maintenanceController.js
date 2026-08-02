const db = require('../db');

// Get all maintenance records
exports.getAllMaintenance = async (req, res) => {
    try {
        const { rows } = await db.query(
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
        const { rows: equipmentRows } = await db.query(
            'SELECT * FROM equipment WHERE id = $1',
            [equipment_id]
        );

        if (equipmentRows.length === 0) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        // Start transaction
        const client = await db.connect();
        await client.query('BEGIN');

        try {
            // Create maintenance record
            const result = await client.query(
                'INSERT INTO maintenance (equipment_id, issue_description, reported_by, repair_cost, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [equipment_id, issue_description, reportedBy, repair_cost || 0, notes || '']
            );

            // Update equipment status to maintenance
            await client.query(
                'UPDATE equipment SET status = $1 WHERE id = $2',
                ['maintenance', equipment_id]
            );

            await client.query('COMMIT');
            client.release();

            res.status(201).json({
                message: 'Maintenance record created successfully',
                maintenanceId: result.rows[0].id
            });
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
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

        const { rows } = await db.query(
            'SELECT * FROM maintenance WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Maintenance record not found' });
        }

        const maintenance = rows[0];

        // Start transaction
        const client = await db.connect();
        await client.query('BEGIN');

        try {
            let completedDate = null;
            if (status === 'completed') {
                completedDate = new Date();
            }

            await client.query(
                'UPDATE maintenance SET status = $1, notes = $2, repair_cost = $3, completed_date = $4 WHERE id = $5',
                [status, notes || maintenance.notes, repair_cost !== undefined ? repair_cost : maintenance.repair_cost, completedDate, id]
            );

            // If maintenance is completed or cancelled, update equipment status back to available
            if (status === 'completed' || status === 'cancelled') {
                await client.query(
                    'UPDATE equipment SET status = $1 WHERE id = $2',
                    ['available', maintenance.equipment_id]
                );
            }

            await client.query('COMMIT');
            client.release();

            res.json({ message: 'Maintenance status updated successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
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

        const { rows } = await db.query(
            'SELECT * FROM maintenance WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Maintenance record not found' });
        }

        await db.query('DELETE FROM maintenance WHERE id = $1', [id]);

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
        const { rows: statusRows } = await db.query(
            'SELECT status, COUNT(*) as count FROM maintenance GROUP BY status'
        );

        // Total repair cost
        const { rows: costRows } = await db.query(
            'SELECT COALESCE(SUM(repair_cost), 0) as total_cost FROM maintenance WHERE status = $1',
            ['completed']
        );

        // Recent maintenance (last 30 days)
        const { rows: recentRows } = await db.query(
            "SELECT COUNT(*) as count FROM maintenance WHERE reported_date >= NOW() - INTERVAL '30 days'"
        );

        res.json({
            statusCounts: statusRows.map(r => ({ ...r, count: Number(r.count) })),
            totalRepairCost: Number(costRows[0].total_cost),
            recentCount: Number(recentRows[0].count)
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
        const { rows: equipmentRows } = await db.query(
            'SELECT id FROM equipment WHERE name = $1',
            [equipment_name]
        );

        if (equipmentRows.length === 0) {
            return res.status(400).json({ message: `Equipment "${equipment_name}" not found` });
        }

        // Find user by name (reporter)
        const { rows: userRows } = await db.query(
            'SELECT id FROM users WHERE name = $1',
            [reported_by_name]
        );

        const reportedById = userRows.length > 0 ? userRows[0].id : req.user.id;

        await db.query(
            'INSERT INTO maintenance (equipment_id, issue_description, reported_by, reported_date, completed_date, repair_cost, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [equipmentRows[0].id, issue_description, reportedById, reported_date, completed_date || null, repair_cost || 0, status || 'reported']
        );

        res.status(201).json({ message: 'Maintenance record imported successfully' });
    } catch (error) {
        console.error('Import maintenance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

