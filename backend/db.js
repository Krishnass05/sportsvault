const { Pool } = require('pg');
require('dotenv').config();

// Supabase / PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    max: 10,                        // max pool connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }   // required for Supabase
        : false
});

// Test connection
pool.query('SELECT NOW()')
    .then(() => console.log('Database connected successfully'))
    .catch(err => console.error('Database connection failed:', err.message));

module.exports = pool;

