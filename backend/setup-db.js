const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    family: 4
});

const setupDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log('Connected to PostgreSQL server');

        // Create tables
        const tables = [
            `CREATE TABLE IF NOT EXISTS student_ids (
                id BIGSERIAL PRIMARY KEY,
                student_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100),
                school VARCHAR(100),
                is_registered BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('admin', 'student')),
                student_id VARCHAR(50) UNIQUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (student_id) REFERENCES student_ids(student_id) ON DELETE SET NULL
            )`,
            `CREATE TABLE IF NOT EXISTS equipment (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                description TEXT,
                total_quantity INT NOT NULL DEFAULT 0,
                available_quantity INT NOT NULL DEFAULT 0,
                status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'issued', 'maintenance', 'damaged')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS equipment_issues (
                id BIGSERIAL PRIMARY KEY,
                equipment_id BIGINT NOT NULL,
                user_id BIGINT NOT NULL,
                issue_date TIMESTAMPTZ DEFAULT NOW(),
                return_date TIMESTAMPTZ,
                status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'returned')),
                FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS venues (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(200),
                capacity INT,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS bookings (
                id BIGSERIAL PRIMARY KEY,
                venue_id BIGINT NOT NULL,
                user_id BIGINT NOT NULL,
                booking_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                purpose VARCHAR(200),
                approx_students INT,
                status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'pending', 'approved', 'rejected')),
                booking_type VARCHAR(20) DEFAULT 'student' CHECK (booking_type IN ('student', 'admin', 'event')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS maintenance (
                id BIGSERIAL PRIMARY KEY,
                equipment_id BIGINT NOT NULL,
                issue_description TEXT NOT NULL,
                reported_by BIGINT NOT NULL,
                status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'completed', 'cancelled')),
                reported_date TIMESTAMPTZ DEFAULT NOW(),
                completed_date TIMESTAMPTZ,
                repair_cost DECIMAL(10, 2),
                notes TEXT,
                FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
                FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
            )`
        ];

        for (const tableSQL of tables) {
            await client.query(tableSQL);
        }
        console.log('All tables created successfully');

// Insert sample venues
        const { rows: venueRows } = await client.query('SELECT COUNT(*) as count FROM venues');
        if (Number(venueRows[0].count) === 0) {
            await client.query(`
                INSERT INTO venues (name, location, capacity, description) VALUES
                ('Pickleball Court 1', 'Indoor Arena', 8, 'Pickleball court with net and lines'),
                ('Pickleball Court 2', 'Indoor Arena', 8, 'Pickleball court with net and lines'),
                ('Cricket Turf', 'Sports Complex A', 500, 'Cricket turf ground'),
                ('Football Turf', 'Sports Complex A', 200, 'Football turf ground'),
                ('Basketball Court 1', 'Indoor Arena', 100, 'Indoor basketball court'),
                ('Basketball Court 2', 'Indoor Arena', 100, 'Indoor basketball court'),
                ('Badminton Court', 'Indoor Arena', 80, 'Badminton court with wooden flooring'),
                ('Volleyball Court', 'Beach Sports Area', 100, 'Volleyball court')
            `);
            console.log('Sample venues inserted');
        }

        // Insert sample equipment
        const { rows: equipmentRows } = await client.query('SELECT COUNT(*) as count FROM equipment');
        if (Number(equipmentRows[0].count) === 0) {
            await client.query(`
                INSERT INTO equipment (name, category, description, total_quantity, available_quantity, status) VALUES
                ('Cricket Bat', 'Cricket', 'English willow cricket bat', 20, 20, 'available'),
                ('Cricket Ball', 'Cricket', 'Leather cricket ball', 50, 50, 'available'),
                ('Football', 'Football', 'Size 5 professional football', 30, 30, 'available'),
                ('Basketball', 'Basketball', 'Official size basketball', 25, 25, 'available'),
                ('Tennis Racket', 'Tennis', 'Professional tennis racket', 15, 15, 'available'),
                ('Tennis Ball', 'Tennis', 'Tennis ball can (3 balls)', 40, 40, 'available'),
                ('Badminton Racket', 'Badminton', 'Carbon fiber badminton racket', 30, 30, 'available'),
                ('Shuttlecock', 'Badminton', 'Feather shuttlecock tube', 50, 50, 'available'),
                ('Volleyball', 'Volleyball', 'Official size volleyball', 20, 20, 'available'),
                ('Hockey Stick', 'Hockey', 'Composite hockey stick', 25, 25, 'available')
            `);
            console.log('Sample equipment inserted');
        }

// Create admin users (if not exists)
        const admins = [
            { name: 'Admin Rakesh', email: 'rakesha.dm@nmims.edu' },
            { name: 'Sports Admin', email: 'Sports.blr@nmims.edu' }
        ];
        for (const admin of admins) {
            const { rows: adminRows } = await client.query(
                'SELECT COUNT(*) as count FROM users WHERE email = $1',
                [admin.email]
            );
            if (Number(adminRows[0].count) === 0) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await client.query(
                    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
                    [admin.name, admin.email, hashedPassword, 'admin']
                );
                console.log(`Admin user created: ${admin.email}`);
            }
        }

        // Create dummy student for testing purposes
        const DUMMY_SAP_ID = 'DUMMY001';
        const DUMMY_EMAIL = 'student@sportvault.com';

        // Ensure dummy SAP ID exists in student_ids (marked as registered)
        const { rows: studentIdRows } = await client.query(
            'SELECT COUNT(*) as count FROM student_ids WHERE student_id = $1',
            [DUMMY_SAP_ID]
        );
        if (Number(studentIdRows[0].count) === 0) {
            await client.query(
                'INSERT INTO student_ids (student_id, name, school, is_registered) VALUES ($1, $2, $3, TRUE)',
                [DUMMY_SAP_ID, 'Test Student', 'School of Testing']
            );
            console.log('Dummy student SAP ID created (DUMMY001)');
        } else {
            // Ensure it is marked as registered with name/school populated
            await client.query(
                'UPDATE student_ids SET is_registered = TRUE, name = $1, school = $2 WHERE student_id = $3',
                ['Test Student', 'School of Testing', DUMMY_SAP_ID]
            );
        }

        // Create dummy student user account (if not exists)
        const { rows: dummyUserRows } = await client.query(
            'SELECT COUNT(*) as count FROM users WHERE email = $1',
            [DUMMY_EMAIL]
        );
        if (Number(dummyUserRows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('student123', 10);
            await client.query(
                'INSERT INTO users (name, email, password, role, student_id) VALUES ($1, $2, $3, $4, $5)',
                ['Test Student', DUMMY_EMAIL, hashedPassword, 'student', DUMMY_SAP_ID]
            );
            console.log('Dummy student user created');
        }

        console.log('\n=================================');
        console.log('Database setup completed successfully!');
        console.log('=================================');
console.log('Admin: rakesha.dm@nmims.edu / admin123');
        console.log('Admin: Sports.blr@nmims.edu / admin123');
        console.log('Dummy Student: student@sportvault.com / student123');
        console.log('=================================');

        process.exit(0);
    } catch (error) {
        console.error('Database setup failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
    }
};

setupDatabase();

