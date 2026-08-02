const { Pool } = require('pg');
require('dotenv').config();

// Supabase / PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    max: 5,                         // max pool connections (reduced for pooler)
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // increased for slower networks
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }   // required for Supabase
        : false,
    family: 4                       // force IPv4 to avoid IPv6 ENETUNREACH on Railway
});

// Test connection
pool.query('SELECT NOW()')
    .then(() => console.log('Database connected successfully'))
    .catch(err => console.error('Database connection failed:', err.message));

module.exports = pool;

