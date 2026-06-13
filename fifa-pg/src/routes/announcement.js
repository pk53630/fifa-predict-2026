// src/routes/announcement.js
// GET  /api/announcement         — any user: get current announcement
// POST /api/announcement         — admin: set announcement
// DELETE /api/announcement       — admin: clear announcement

const express = require('express');
const pool    = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Create announcements table if not exists (called on first use)
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// GET /api/announcement — returns the latest announcement (any logged-in user)
router.get('/', requireAuth, async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      'SELECT * FROM announcements ORDER BY created_at DESC LIMIT 1'
    );
    if (!rows.length) return res.json({ title: null, message: null });
    res.json({ title: rows[0].title, message: rows[0].message, created_at: rows[0].created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcement — admin sets a new announcement
// Body: { title, message }
router.post('/', requireAdmin, async (req, res) => {
  try {
    await ensureTable();
    const { title, message } = req.body;
    if (!title || !message)
      return res.status(400).json({ error: 'title and message are required' });

    // Clear old ones, keep only the latest
    await pool.query('DELETE FROM announcements');
    await pool.query(
      'INSERT INTO announcements (title, message) VALUES ($1, $2)',
      [title, message]
    );
    res.json({ message: 'Announcement set successfully', title, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/announcement — admin clears the announcement
router.delete('/', requireAdmin, async (req, res) => {
  try {
    await ensureTable();
    await pool.query('DELETE FROM announcements');
    res.json({ message: 'Announcement cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
