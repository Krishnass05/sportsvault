# SportVault Setup Guide

Complete step-by-step guide to set up and run SportVault on any system.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Project Setup](#project-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Variables](#environment-variables)
6. [Running the Application](#running-the-application)
7. [First Time Setup](#first-time-setup)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, macOS, or Linux
- **RAM**: 4 GB minimum (8 GB recommended)
- **Storage**: 500 MB free space
- **Browser**: Chrome, Firefox, Edge, or Safari (latest versions)

### Software Requirements
- **Node.js**: v14.0.0 or higher
- **MySQL**: v5.7 or higher (v8.0 recommended)
- **Git**: For cloning (optional)

---

## Prerequisites Installation

### Step 1: Install Node.js

#### Windows
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer (LTS version recommended)
3. Verify installation:
```powershell
node --version
npm --version
```

#### macOS
Using Homebrew:
```bash
brew install node
```

Or download from [nodejs.org](https://nodejs.org/)

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install MySQL

#### Windows
1. Download MySQL Installer from [mysql.com](https://dev.mysql.com/downloads/installer/)
2. Run the installer and choose "Server only" or "Full" installation
3. Set root password during installation
4. Remember the password - you'll need it later

#### macOS
Using Homebrew:
```bash
brew install mysql
brew services start mysql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### Step 3: Verify MySQL Installation

```bash
# Windows (PowerShell)
mysql --version

# macOS/Linux
mysql --version
```

---

## Project Setup

### Step 1: Get the Project Files

#### Option A: Copy from existing system
Copy the entire `sportsvault` folder to the new system.

#### Option B: Clone from Git (if using version control)
```bash
git clone <repository-url>
cd sportsvault
```

### Step 2: Navigate to Project Directory

```powershell
# Windows
cd "path\to\sportsvault\backend"

# macOS/Linux
cd /path/to/sportsvault/backend
```

### Step 3: Install Dependencies

```bash
npm install
```

This will install all required packages:
- express
- mysql2
- bcryptjs
- jsonwebtoken
- cors
- dotenv

---

## Database Configuration

### Step 1: Start MySQL Server

#### Windows
- MySQL should start automatically as a service
- Or start manually from Services panel

#### macOS
```bash
brew services start mysql
```

#### Linux
```bash
sudo systemctl start mysql
```

### Step 2: Create Database

#### Option A: Using MySQL CLI (if available)

```bash
mysql -u root -p
```

Enter your root password, then:

```sql
CREATE DATABASE sportsvault;
EXIT;
```

#### Option B: Using MySQL Workbench
1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Create new schema named `sportsvault`

#### Option C: Using Node.js Setup Script

```bash
node setup-db.js
```

This script will:
- Create the database if it doesn't exist
- Create all required tables
- Set up initial structure

---

## Environment Variables

### Step 1: Create .env File

In the `backend` directory, create a file named `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sportsvault

# JWT Secret (generate a random string)
JWT_SECRET=your_random_secret_key_here

# Server Port
PORT=3000
```

### Step 2: Replace Values

- `DB_PASSWORD`: Replace with your actual MySQL root password
- `JWT_SECRET`: Replace with a random string (minimum 32 characters recommended)
  - Example: `JWT_SECRET=SportVault2024SecureKey1234567890`

### Important Security Notes

- Never commit the `.env` file to version control
- Use a strong, unique JWT secret
- Keep MySQL password secure
- In production, use environment-specific variables

---

## Running the Application

### Step 1: Start the Backend Server

```bash
npm start
```

You should see output like:
```
=================================
  SportVault Server Running
=================================
Server URL: http://localhost:3000
API Base: http://localhost:3000/api
=================================
Database connected successfully
```

### Step 2: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

---

## First Time Setup

### Step 1: Admin Accounts

Admin accounts are created automatically during database setup:

- Email: `rakesha.dm@nmims.edu`
- Password: `admin123`

- Email: `Sports.blr@nmims.edu`
- Password: `admin123`

#### Option A: Using API (Recommended, if needed)

Send a POST request to create an additional admin:

```bash
curl -X POST http://localhost:3000/api/admin/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

#### Option B: Direct Database Insert (Emergency only)

```sql
-- Generate password hash first using bcrypt
-- Then insert into database
INSERT INTO users (name, email, password, role) 
VALUES ('Admin', 'admin@example.com', '$2a$10$...', 'admin');
```

### Step 2: Login as Admin

1. Go to `http://localhost:3000/login`
2. Enter admin credentials:
   - Email: `rakesha.dm@nmims.edu`
   - Password: `admin123`
   - Or Email: `Sports.blr@nmims.edu`
   - Password: `admin123`
3. Click Login

### Step 3: Create Student IDs

Before students can register, admin must create Student IDs:

1. Go to Dashboard
2. Click "Manage Student IDs"
3. Add Student IDs (e.g., "STU001", "STU002")
4. Share these IDs with students

### Step 4: Add Equipment

1. Go to Equipment page
2. Click "Add Equipment"
3. Fill in details:
   - Name: e.g., "Cricket Bat"
   - Category: e.g., "Cricket"
   - Total Quantity: e.g., 10
4. Save

### Step 5: Add Venues

1. Go to Booking page
2. Click "Add Venue" (admin only)
3. Fill in details:
   - Name: e.g., "Main Cricket Ground"
   - Capacity: e.g., 50
   - Location: e.g., "Sports Complex"
4. Save

---

## Platform-Specific Instructions

### Windows

#### Using PowerShell
```powershell
# Navigate to project
cd "C:\path\to\sportsvault\backend"

# Install dependencies
npm install

# Setup database
node setup-db.js

# Start server
npm start
```

#### Common Windows Issues

**Issue: PowerShell execution policy**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Issue: MySQL not in PATH**
- Add MySQL bin directory to system PATH
- Or use full path: `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql`

### macOS

#### Using Terminal
```bash
# Navigate to project
cd /path/to/sportsvault/backend

# Install dependencies
npm install

# Setup database
node setup-db.js

# Start server
npm start
```

#### Common macOS Issues

**Issue: Permission denied**
```bash
sudo chown -R $(whoami) ~/.npm
```

**Issue: MySQL connection refused**
```bash
brew services restart mysql
```

### Linux (Ubuntu/Debian)

#### Using Terminal
```bash
# Navigate to project
cd /path/to/sportsvault/backend

# Install dependencies
npm install

# Setup database
node setup-db.js

# Start server
npm start
```

#### Common Linux Issues

**Issue: Port 3000 already in use**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

**Issue: MySQL access denied**
```bash
# Reset MySQL root password
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

---

## Troubleshooting

### Issue: "Cannot find module"

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue: "Database connection failed"

**Check:**
1. MySQL server is running
2. Credentials in .env are correct
3. Database `sportsvault` exists

**Debug:**
```bash
# Test MySQL connection
mysql -u root -p -e "SHOW DATABASES;"
```

### Issue: "Port already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

Or change port in .env:
```env
PORT=3001
```

### Issue: "JWT Secret not set"

**Solution:**
Make sure `.env` file exists in backend directory with:
```env
JWT_SECRET=your_random_secret_key_here
```

### Issue: "Access denied for user 'root'@'localhost'"

**Solution:**
```sql
-- In MySQL
CREATE USER 'sportsvault'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON sportsvault.* TO 'sportsvault'@'localhost';
FLUSH PRIVILEGES;
```

Then update .env:
```env
DB_USER=sportsvault
DB_PASSWORD=password
```

### Issue: Frontend shows "Failed to load data"

**Check:**
1. Backend server is running
2. No errors in browser console (F12)
3. API endpoints are accessible

**Debug:**
```bash
# Test API
curl http://localhost:3000/api/equipment
```

---

## Production Deployment

### Environment Variables

Create separate `.env` files for different environments:

**Production (.env.production):**
```env
DB_HOST=production-db-host
DB_USER=sportsvault_prod
DB_PASSWORD=strong_production_password
DB_NAME=sportsvault_prod
JWT_SECRET=very_long_random_string_min_32_chars
PORT=3000
NODE_ENV=production
```

### Security Checklist

- [ ] Use strong, unique passwords
- [ ] Enable MySQL SSL connections
- [ ] Set up firewall rules
- [ ] Use HTTPS with SSL certificate
- [ ] Enable CORS only for trusted domains
- [ ] Regular security updates
- [ ] Database backups

### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start server.js --name sportsvault

# Save PM2 config
pm2 save
pm2 startup
```

---

## Quick Reference Commands

```bash
# Start development server
npm start

# Setup database
node setup-db.js

# Check Node version
node --version

# Check MySQL version
mysql --version

# View logs (if using PM2)
pm2 logs sportsvault

# Restart server (if using PM2)
pm2 restart sportsvault
```

---

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review the README.md file
3. Check browser console for errors
4. Check server terminal for logs

---

**Last Updated**: April 2026  
**Version**: 1.0.0
