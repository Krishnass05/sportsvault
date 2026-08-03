# SportVault: Sports Equipment & Venue Management System

A comprehensive web-based management system for sports equipment and venue bookings, designed for educational institutions with admin-controlled student registration.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Features Implemented](#features-implemented)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [User Roles & Permissions](#user-roles--permissions)
8. [Installation & Setup](#installation--setup)
9. [Development Workflow](#development-workflow)
10. [Key Implementation Details](#key-implementation-details)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

SportVault is a full-stack web application that streamlines the management of sports equipment and venue bookings. The system supports two user roles:

- **Admin**: Manages equipment, venues, student registrations, and views comprehensive reports
- **Student**: Issues equipment, books venues, and tracks their activities

### Key Features

- Admin-controlled student registration via Student IDs
- Equipment management with availability tracking
- Venue booking with conflict detection
- Maintenance tracking with cost management
- Historical data reporting with CSV export/import
- Synthetic data generation for testing
- Role-based access control
- **Email notifications (SMTP)** for booking confirmations, cancellations, and registration welcome

---

## Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom styling with CSS variables
- **JavaScript (ES6+)** - Vanilla JS with async/await
- **No frameworks** - Lightweight, dependency-free approach

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Database driver with Promise support
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Database
- **MySQL** - Relational database
- **Connection pooling** - For efficient database connections

### Development Tools
- **PowerShell** - Windows command-line interface
- **MySQL Workbench** - Database management (optional)

---

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Express API    │────▶│   MySQL DB      │
│   (HTML/CSS/JS) │◀────│   (Node.js)      │◀────│   (sportsvault) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│   JWT Auth      │     │   Middleware     │
│   (localStorage)│     │   (verifyToken)  │
└─────────────────┘     └──────────────────┘
```

### Directory Structure

```
sportsvault/
├── backend/
│   ├── controllers/      # Business logic
│   ├── middleware/       # Auth & validation
│   ├── routes/          # API route definitions
│   ├── db.js            # Database connection
│   ├── server.js        # Express app entry
│   └── setup-db.js      # Database initialization
├── frontend/
│   ├── html/            # HTML pages
│   ├── css/             # Stylesheets
│   └── js/              # Client-side scripts
├── .env                 # Environment variables
└── README.md           # This file
```

---

## Features Implemented

### 1. Authentication System
- JWT-based authentication
- Role-based access control (Admin/Student)
- Admin-controlled student registration via Student IDs
- Secure password hashing with bcryptjs

### 2. Equipment Management
- **Admin Features:**
  - Add, edit, delete equipment
  - Set total quantity and availability
  - Track issued equipment
  - View equipment statistics
  
- **Student Features:**
  - View available equipment
  - Issue equipment (max 2 per type)
  - Return equipment
  - View issued equipment list

### 3. Venue Booking System
- **Admin Features:**
  - Add and manage venues
  - View all bookings
  - Approve/reject/cancel bookings
  - View booking history
  
- **Student Features:**
  - Book available venues
  - Select date and time slots
  - View own bookings
  - Cancel pending bookings
  - Double-booking prevention

### 4. Maintenance Tracking
- **Admin Features:**
  - Report maintenance issues
  - Track repair costs in Rupees (₹)
  - Update maintenance status
  - View maintenance history
  - Delete maintenance records

### 5. Reports & Analytics (Admin Only)
- **Equipment Issue History:**
  - View all equipment issues
  - Download CSV export
  - Upload CSV import
  - Generate synthetic data
  - Edit/Delete records
  
- **Booking History:**
  - View all venue bookings
  - Filter by status
  - CSV export/import
  - Synthetic data generation
  - Edit/Delete bookings
  
- **Maintenance History:**
  - View all maintenance records
  - Track repair costs
  - CSV export/import
  - Synthetic data generation
  - Edit/Delete records

### 6. Dashboard
- **Admin Dashboard:**
  - Total equipment count
  - Available equipment count
  - Active bookings count
  - Pending maintenance count
  - Recent activities
  
- **Student Dashboard:**
  - Issued equipment list
  - Upcoming bookings
  - Quick actions

### 7. Email Notifications
- **Nodemailer SMTP integration** for transactional emails
- **Booking confirmation** — Email sent to student immediately after booking is confirmed (auto-confirmed)
- **Booking cancellation** — Email sent to student when admin or student cancels a booking
- **Registration welcome** — Welcome email sent to student upon successful registration
- **Graceful fallback** — Emails logged to console if SMTP is not configured (no crash)

---

## Database Schema

### Tables

#### 1. users
```sql
- id (INT, PK, AUTO_INCREMENT)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- password (VARCHAR) - hashed
- role (ENUM: 'admin', 'student')
- student_id (VARCHAR, UNIQUE, NULLABLE)
- created_at (TIMESTAMP)
```

#### 2. student_ids
```sql
- id (INT, PK, AUTO_INCREMENT)
- student_id (VARCHAR, UNIQUE)
- is_registered (BOOLEAN)
- created_at (TIMESTAMP)
```

#### 3. equipment
```sql
- id (INT, PK, AUTO_INCREMENT)
- name (VARCHAR)
- category (VARCHAR)
- description (TEXT)
- total_quantity (INT)
- available_quantity (INT)
- status (ENUM: 'available', 'issued', 'maintenance')
- created_at (TIMESTAMP)
```

#### 4. equipment_issues
```sql
- id (INT, PK, AUTO_INCREMENT)
- equipment_id (INT, FK)
- user_id (INT, FK)
- issue_date (TIMESTAMP)
- return_date (TIMESTAMP, NULLABLE)
- status (ENUM: 'issued', 'returned')
```

#### 5. venues
```sql
- id (INT, PK, AUTO_INCREMENT)
- name (VARCHAR)
- description (TEXT)
- capacity (INT)
- location (VARCHAR)
- status (ENUM: 'available', 'booked', 'maintenance')
- created_at (TIMESTAMP)
```

#### 6. bookings
```sql
- id (INT, PK, AUTO_INCREMENT)
- venue_id (INT, FK)
- user_id (INT, FK)
- booking_date (DATE)
- start_time (TIME)
- end_time (TIME)
- purpose (TEXT)
- status (ENUM: 'pending', 'approved', 'rejected', 'cancelled')
- created_at (TIMESTAMP)
```

#### 7. maintenance
```sql
- id (INT, PK, AUTO_INCREMENT)
- equipment_id (INT, FK)
- issue_description (TEXT)
- reported_by (INT, FK)
- reported_date (DATE)
- completed_date (DATE, NULLABLE)
- repair_cost (DECIMAL)
- status (ENUM: 'reported', 'in_progress', 'completed', 'cancelled')
- created_at (TIMESTAMP)
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Register new user |
| POST | /api/login | User login |
| GET | /api/profile | Get user profile |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/create-student-id | Create student ID |
| GET | /api/admin/student-ids | Get all student IDs |
| DELETE | /api/admin/student-ids/:id | Delete student ID |
| GET | /api/admin/dashboard-stats | Get dashboard statistics |
| GET | /api/admin/users | Get all users |

### Equipment
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/equipment | Get all equipment |
| GET | /api/equipment/stats | Get equipment stats |
| GET | /api/equipment/:id | Get equipment by ID |
| GET | /api/equipment/my/equipment | Get student's equipment |
| POST | /api/equipment/:id/issue | Issue equipment |
| POST | /api/equipment/:id/return | Return equipment |
| GET | /api/equipment/issues-history | Get issues history (admin) |
| POST | /api/equipment/import-issue | Import equipment issue (admin) |
| PUT | /api/equipment/issues/:id | Update issue (admin) |
| DELETE | /api/equipment/issues/:id | Delete issue (admin) |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/bookings | Get all bookings |
| GET | /api/bookings/venues | Get all venues |
| POST | /api/bookings | Create booking |
| PUT | /api/bookings/:id/cancel | Cancel booking |
| PUT | /api/bookings/:id/status | Update booking status (admin) |
| POST | /api/bookings/import | Import booking (admin) |

### Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/maintenance | Get all maintenance records |
| POST | /api/maintenance | Create maintenance record |
| PUT | /api/maintenance/:id | Update maintenance status |
| DELETE | /api/maintenance/:id | Delete maintenance record |
| GET | /api/maintenance/stats | Get maintenance stats |
| POST | /api/maintenance/import | Import maintenance (admin) |

---

## User Roles & Permissions

### Admin
- Full access to all features
- Manage equipment (CRUD)
- Manage venues (CRUD)
- Manage student IDs
- View and manage all bookings
- View and manage all maintenance records
- Access reports and analytics
- Export/Import CSV data
- Generate synthetic data

### Student
- View available equipment
- Issue equipment (max 2 per type)
- Return equipment
- View own issued equipment
- Book venues
- View own bookings
- Cancel own pending bookings
- Cannot access admin features

---

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- Windows PowerShell

### Step 1: Clone/Extract Project
```powershell
cd "c:\Users\krishna patil\OneDrive\Desktop\sportsvault"
```

### Step 2: Install Dependencies
```powershell
cd backend
npm install
```

### Step 3: Configure Environment
Create `.env` file in backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sportsvault
JWT_SECRET=your_jwt_secret_key
PORT=3000

# SMTP Configuration (for email notifications - Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=SportVault
```

### Step 4: Setup Database
```powershell
node setup-db.js
```

### Step 5: Start Server
```powershell
npm start
```

### Step 6: Access Application
- Open browser: http://localhost:3000
- Admin accounts: `rakesha.dm@nmims.edu` / `admin123` and `Sports.blr@nmims.edu` / `admin123`
- **Dummy student for testing:** `student@sportvault.com` / `student123` (SAP ID: `DUMMY001`)

---

## Development Workflow

### 1. Initial Setup Phase
- Project structure creation
- Database schema design
- Environment configuration
- Basic Express server setup

### 2. Authentication Implementation
- JWT token generation and validation
- Password hashing with bcryptjs
- Login/Register forms
- Role-based middleware

### 3. Core Features Development
- Equipment management (CRUD)
- Venue booking system
- Maintenance tracking
- Student ID management

### 4. Reporting & Analytics
- Historical data tracking
- CSV export functionality
- CSV import functionality
- Synthetic data generation

### 5. UI/UX Enhancements
- Responsive design
- Role-based UI visibility
- Collapsible dropdowns
- Alert notifications

### 6. Bug Fixes & Optimizations
- Route ordering fixes
- Error handling improvements
- Colspan corrections
- API endpoint debugging

---

## Key Implementation Details

### 1. JWT Authentication Flow
```javascript
// Token generation on login
const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);

// Token verification middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
};
```

### 2. Equipment Issue Limit (Per Type)
```javascript
// Check how many of this specific equipment the user has already issued
const [existingIssue] = await db.execute(
    'SELECT * FROM equipment_issues WHERE equipment_id = ? AND user_id = ? AND status = ?',
    [id, userId, 'issued']
);

if (existingIssue.length >= 2) {
    return res.status(400).json({ 
        message: 'You can only issue a maximum of 2 items of the same equipment type' 
    });
}
```

### 3. CSV Export Function
```javascript
function downloadCSV(filename, headers, rows) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => 
            `"${String(cell).replace(/"/g, '""')}"`
        ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
```

### 4. Route Ordering (Express.js)
```javascript
// CORRECT: Specific routes BEFORE parameter routes
router.get('/issues-history', ...);  // Must come first
router.get('/:id', ...);             // Must come after
```

### 5. Transaction Handling
```javascript
const connection = await db.getConnection();
await connection.beginTransaction();

try {
    // Operation 1
    await connection.execute('INSERT INTO ...', [...]);
    // Operation 2
    await connection.execute('UPDATE ...', [...]);
    
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

---

## Troubleshooting

### Issue: "Failed to load data" on Reports page
**Cause:** Route ordering - `/equipment/:id` was catching `/equipment/issues-history`

**Solution:** Reorder routes so specific routes come before parameter routes

### Issue: Synthetic data generation fails
**Cause:** Using fake user names that don't exist in database

**Solution:** Fetch actual users from database before generating synthetic data

### Issue: Equipment Issue History 404 error
**Cause:** Express route parameter matching order

**Solution:** Move `/issues-history` route before `/:id` route

### Issue: MySQL CLI not available in PowerShell
**Solution:** Use Node.js script (`setup-db.js`) for database initialization

### Issue: Student can't see equipment list
**Cause:** Dashboard stats API was admin-only

**Solution:** Create public `/equipment/stats` endpoint and conditional rendering

---

## Future Enhancements

1. **Calendar Integration** - Sync bookings with Google/Outlook calendar
2. **Mobile App** - React Native or Flutter mobile application
3. **Barcode Scanning** - QR code-based equipment check-in/check-out
4. **Analytics Dashboard** - Charts and graphs for usage statistics
5. **Multi-language Support** - i18n for regional languages
6. **Photo Upload** - Equipment and venue images
7. **Review System** - Students can rate equipment and venues

---

## Contributors

- **Project Lead**: Krishna Patil
- **Development**: Full-stack implementation with AI assistance

---

## License

This project is developed for educational purposes.

---

## Contact

For support or queries, please contact the development team.

---

**Last Updated**: April 2026  
**Version**: 1.0.0  
**Status**: Production Ready
