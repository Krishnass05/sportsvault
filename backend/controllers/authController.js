const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const emailService = require('../services/emailService');

// Register new student
exports.register = async (req, res) => {
    try {
        const { student_id, name, email, password, school } = req.body;

        // Validate required fields
        if (!student_id || !name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if student_id exists in student_ids table
        const [studentIdRows] = await db.execute(
            'SELECT * FROM student_ids WHERE student_id = ?',
            [student_id]
        );

        if (studentIdRows.length === 0) {
            return res.status(400).json({ message: 'Invalid Student ID' });
        }

        // Check if student_id is already registered
        if (studentIdRows[0].is_registered) {
            return res.status(400).json({ message: 'Student ID already registered' });
        }

        // Check if email already exists
        const [emailRows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (emailRows.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, student_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, 'student', student_id]
        );

        // Mark student_id as registered and store the name and school
        // provided by the student during registration
        await db.execute(
            'UPDATE student_ids SET is_registered = TRUE, name = ?, school = ? WHERE student_id = ?',
            [name, school || '', student_id]
        );

        // --- Send welcome email ---
        try {
            await emailService.sendWelcomeEmail(email, name);
        } catch (emailError) {
            // Email failure should not fail registration
            console.error('Failed to send welcome email:', emailError.message);
        }

        res.status(201).json({
            message: 'Registration successful',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                name: user.name 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                student_id: user.student_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, role, student_id, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
