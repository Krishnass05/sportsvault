-- ============================================================
-- SportVault - Supabase (PostgreSQL) Database Schema
-- ============================================================
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- or via: supabase db push / psql
-- ============================================================

-- Enable UUID generation (optional, used for auth integration)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Table: student_ids
-- Stores student records imported from CSV or created by admin
-- ============================================================
CREATE TABLE IF NOT EXISTS student_ids (
    id            BIGSERIAL PRIMARY KEY,
    student_id    VARCHAR(50) UNIQUE NOT NULL,
    name          VARCHAR(100),
    school        VARCHAR(100),
    is_registered BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: users
-- Stores user accounts (Admin and Student)
-- NOTE: If you want to integrate with Supabase Auth, use
-- `auth.users` as the parent and reference auth.users(id) as UUID.
-- For standalone app-managed auth, keep this table.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,              -- bcrypt hash
    role       VARCHAR(10) DEFAULT 'student'
               CHECK (role IN ('admin', 'student')),
    student_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_users_student_id
        FOREIGN KEY (student_id) REFERENCES student_ids(student_id)
        ON DELETE SET NULL
);

-- ============================================================
-- Table: equipment
-- Stores sports equipment inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL,
    category           VARCHAR(50) NOT NULL,
    description        TEXT,
    total_quantity     INT NOT NULL DEFAULT 0,
    available_quantity INT NOT NULL DEFAULT 0,
    status             VARCHAR(20) DEFAULT 'available'
                       CHECK (status IN ('available', 'issued', 'maintenance', 'damaged')),
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: equipment_issues
-- Tracks equipment issued to students
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment_issues (
    id           BIGSERIAL PRIMARY KEY,
    equipment_id BIGINT NOT NULL,
    user_id      BIGINT NOT NULL,
    issue_date   TIMESTAMPTZ DEFAULT NOW(),
    return_date  TIMESTAMPTZ,
    status       VARCHAR(10) DEFAULT 'issued'
                 CHECK (status IN ('issued', 'returned')),
    CONSTRAINT fk_issues_equipment
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    CONSTRAINT fk_issues_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Table: venues
-- Stores available venues/grounds with active status
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    location    VARCHAR(200),
    capacity    INT,
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: bookings
-- Stores venue booking records with auto-confirmation
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id              BIGSERIAL PRIMARY KEY,
    venue_id        BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    booking_date    DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    purpose         VARCHAR(200),
    approx_students INT,
    status          VARCHAR(20) DEFAULT 'confirmed'
                    CHECK (status IN ('confirmed', 'cancelled', 'pending', 'approved', 'rejected')),
    booking_type    VARCHAR(10) DEFAULT 'student'
                    CHECK (booking_type IN ('student', 'admin', 'event')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_bookings_venue
        FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Table: maintenance
-- Tracks equipment maintenance records
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance (
    id                BIGSERIAL PRIMARY KEY,
    equipment_id      BIGINT NOT NULL,
    issue_description TEXT NOT NULL,
    reported_by       BIGINT NOT NULL,
    status            VARCHAR(20) DEFAULT 'reported'
                      CHECK (status IN ('reported', 'in_progress', 'completed', 'cancelled')),
    reported_date     TIMESTAMPTZ DEFAULT NOW(),
    completed_date    TIMESTAMPTZ,
    repair_cost       DECIMAL(10, 2),
    notes             TEXT,
    CONSTRAINT fk_maintenance_equipment
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_user
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Trigger: auto-update updated_at on equipment
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_equipment_updated_at ON equipment;
CREATE TRIGGER trigger_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_issues_user        ON equipment_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_equipment   ON equipment_issues(equipment_id);
CREATE INDEX IF NOT EXISTS idx_issues_status      ON equipment_issues(status);
CREATE INDEX IF NOT EXISTS idx_bookings_venue     ON bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user      ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date      ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_eq     ON maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default admin user (password: admin123, bcrypt hashed)
INSERT INTO users (name, email, password, role) VALUES
('System Admin', 'admin@sportvault.com', '$2a$10$3Xw0K/mRGYsvtAc8XDgYBussadiyRKz7EK41mHdfgNF/Jhk3cZL7K', 'admin');

-- Dummy student SAP ID for testing
INSERT INTO student_ids (student_id, name, school, is_registered) VALUES
('DUMMY001', 'Test Student', 'School of Testing', TRUE);

-- Dummy student user account (password: student123, bcrypt hashed)
INSERT INTO users (name, email, password, role, student_id) VALUES
('Test Student', 'student@sportvault.com', '$2a$10$q/BrZkwHyPOF79aTpkrZweHOxP0xAZJl/DdcGmeFR/tFvtBGCuVKu', 'student', 'DUMMY001');

-- Sample venues
INSERT INTO venues (name, location, capacity, description, is_active) VALUES
('Main Cricket Ground', 'Sports Complex A', 500, 'Full-size cricket ground with pavilion', TRUE),
('Football Field 1', 'Sports Complex A', 200, 'Standard size football field with floodlights', TRUE),
('Basketball Court', 'Indoor Arena', 100, 'Indoor basketball court with seating', TRUE),
('Tennis Court 1', 'Tennis Complex', 50, 'Hard court tennis facility', TRUE),
('Badminton Hall', 'Indoor Arena', 80, '4 badminton courts with wooden flooring', TRUE),
('Volleyball Court', 'Beach Sports Area', 100, 'Beach volleyball court', TRUE);

-- Sample equipment
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
('Hockey Stick', 'Hockey', 'Composite hockey stick', 25, 25, 'available');

-- ============================================================
-- ROW LEVEL SECURITY (Recommended for Supabase)
-- Enable RLS on all tables. By default deny all, then add policies.
-- ============================================================
ALTER TABLE student_ids      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance      ENABLE ROW LEVEL SECURITY;

-- Example policies (uncomment & customize as needed):

-- Public read for equipment & venues (anyone can browse)
-- CREATE POLICY "equipment_public_read" ON equipment FOR SELECT USING (true);
-- CREATE POLICY "venues_public_read" ON venues FOR SELECT USING (true);

-- Users can read/update their own profile
-- CREATE POLICY "users_own_row" ON users FOR ALL USING (id = auth.uid()::bigint);

-- Admin full access (add a helper or use JWT claim)
-- CREATE POLICY "admin_all" ON equipment FOR ALL USING (
--   EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::bigint AND users.role = 'admin')
-- );

-- ============================================================
-- END OF SCHEMA
-- ============================================================

