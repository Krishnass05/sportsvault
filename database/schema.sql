-- SportVault Database Schema
-- College Arena Venue Booking System

-- Create database
CREATE DATABASE IF NOT EXISTS sportvault;
USE sportvault;

-- Table: student_ids
-- Stores student records imported from CSV or created by admin
CREATE TABLE IF NOT EXISTS student_ids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    school VARCHAR(100),
    is_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: users
-- Stores user accounts (Admin and Student)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') DEFAULT 'student',
    student_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_ids(student_id) ON DELETE SET NULL
);

-- Table: equipment
-- Stores sports equipment inventory
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    total_quantity INT NOT NULL DEFAULT 0,
    available_quantity INT NOT NULL DEFAULT 0,
    status ENUM('available', 'issued', 'maintenance', 'damaged') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: equipment_issues
-- Tracks equipment issued to students
CREATE TABLE IF NOT EXISTS equipment_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    user_id INT NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    return_date TIMESTAMP NULL,
    status ENUM('issued', 'returned') DEFAULT 'issued',
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: venues
-- Stores available venues/grounds with active status
CREATE TABLE IF NOT EXISTS venues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    capacity INT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: bookings
-- Stores venue booking records with auto-confirmation
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venue_id INT NOT NULL,
    user_id INT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose VARCHAR(200),
    approx_students INT,
    status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
    booking_type ENUM('student', 'admin', 'event') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table: maintenance
-- Tracks equipment maintenance records
CREATE TABLE IF NOT EXISTS maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    issue_description TEXT NOT NULL,
    reported_by INT NOT NULL,
    status ENUM('reported', 'in_progress', 'completed', 'cancelled') DEFAULT 'reported',
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP NULL,
    repair_cost DECIMAL(10, 2),
    notes TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert admin users
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (name, email, password, role) VALUES 
('Admin Rakesh', 'rakesha.dm@nmims.edu', '$2a$10$YourHashedPasswordHere', 'admin'),
('Sports Admin', 'Sports.blr@nmims.edu', '$2a$10$YourHashedPasswordHere', 'admin');

-- Insert dummy student SAP ID for testing purposes
INSERT INTO student_ids (student_id, name, school, is_registered) VALUES
('DUMMY001', 'Test Student', 'School of Testing', TRUE);

-- Insert dummy student user account for testing purposes
-- Password: student123 (hashed with bcrypt)
INSERT INTO users (name, email, password, role, student_id) VALUES 
('Test Student', 'student@sportvault.com', '$2a$10$YourHashedPasswordHere', 'student', 'DUMMY001');

-- Insert sample venues
INSERT INTO venues (name, location, capacity, description, is_active) VALUES
('Pickleball Court 1', 'Indoor Arena', 8, 'Pickleball court with net and lines', TRUE),
('Pickleball Court 2', 'Indoor Arena', 8, 'Pickleball court with net and lines', TRUE),
('Cricket Turf', 'Sports Complex A', 500, 'Cricket turf ground', TRUE),
('Football Turf', 'Sports Complex A', 200, 'Football turf ground', TRUE),
('Basketball Court 1', 'Indoor Arena', 100, 'Indoor basketball court', TRUE),
('Basketball Court 2', 'Indoor Arena', 100, 'Indoor basketball court', TRUE),
('Badminton Court', 'Indoor Arena', 80, 'Badminton court with wooden flooring', TRUE),
('Volleyball Court', 'Beach Sports Area', 100, 'Volleyball court', TRUE);

-- Insert sample equipment
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
</content>

