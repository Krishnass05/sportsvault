const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/booking');
const equipmentRoutes = require('./routes/equipment');
const maintenanceRoutes = require('./routes/maintenance');

// API routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// HTML page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/dashboard.html'));
});

app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/booking.html'));
});

// Legacy pages kept routable for direct access (not linked in simplified nav)
app.get('/equipment', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/equipment.html'));
});

app.get('/maintenance', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/maintenance.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/reports.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'SportVault API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`  SportVault Server Running`);
    console.log(`=================================`);
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log(`API Base: http://localhost:${PORT}/api`);
    console.log(`=================================`);
});

module.exports = app;
