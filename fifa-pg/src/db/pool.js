// src/db/pool.js
// Single pg Pool shared across all route files.
// Reads DATABASE_URL from environment (set by Render automatically).

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's free Postgres requires SSL
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;
