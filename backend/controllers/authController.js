const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const emailService = require('../services/emailService');

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

// Register new student
exports.register = async (req, res) => {
    try {
        const { student_id, name, email, password, school } = req.body;

        // Validate required fields
        if (!student_id || !name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if student_id exists in student_ids table
        const { rows: studentIdRows } = await db.query(
            'SELECT * FROM student_ids WHERE student_id = $1',
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
        const { rows: emailRows } = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (emailRows.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await db.query(
            'INSERT INTO users (name, email, password, role, student_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, email, hashedPassword, 'student', student_id]
        );

        // Mark student_id as registered and store the name and school
        // provided by the student during registration
        await db.query(
            'UPDATE student_ids SET is_registered = TRUE, name = $1, school = $2 WHERE student_id = $3',
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
            userId: result.rows[0].id
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
        const { rows } = await db.query(
            'SELECT * FROM users WHERE email = $1',
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

// Request a password reset OTP
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Always return the same generic response, whether or not the
        // email exists, so this endpoint can't be used to enumerate accounts.
        const genericResponse = () => res.json({
            message: 'If an account with that email exists, a password reset code has been sent.'
        });

        const { rows } = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
        if (rows.length === 0) {
            return genericResponse();
        }

        const user = rows[0];

        // Rate-limit how often a new code can be requested for this account
        const { rows: recentRows } = await db.query(
            'SELECT created_at FROM password_reset_otps WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [user.id]
        );
        if (recentRows.length > 0) {
            const secondsSinceLast = (Date.now() - new Date(recentRows[0].created_at).getTime()) / 1000;
            if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
                return res.status(429).json({
                    message: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)} seconds before requesting another code`
                });
            }
        }

        // Generate a cryptographically random 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Invalidate any previous codes for this account before issuing a new one
        await db.query('DELETE FROM password_reset_otps WHERE user_id = $1', [user.id]);
        await db.query(
            'INSERT INTO password_reset_otps (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, otpHash, expiresAt]
        );

        try {
            await emailService.sendPasswordResetOtp(user.email, user.name, otp);
        } catch (emailError) {
            console.error('Failed to send password reset OTP email:', emailError.message);
        }

        return genericResponse();
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Verify OTP and set a new password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, code, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const genericError = () => res.status(400).json({ message: 'Invalid or expired code' });

        const { rows: userRows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRows.length === 0) {
            return genericError();
        }
        const userId = userRows[0].id;

        const { rows: otpRows } = await db.query(
            'SELECT * FROM password_reset_otps WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        if (otpRows.length === 0) {
            return genericError();
        }
        const otpRow = otpRows[0];

        if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
            await db.query('DELETE FROM password_reset_otps WHERE id = $1', [otpRow.id]);
            return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' });
        }

        const isValidOtp = await bcrypt.compare(otp, otpRow.otp_hash);
        if (!isValidOtp) {
            await db.query('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1', [otpRow.id]);
            return genericError();
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
        await db.query('DELETE FROM password_reset_otps WHERE user_id = $1', [userId]);

        res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, email, role, student_id, created_at FROM users WHERE id = $1',
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

