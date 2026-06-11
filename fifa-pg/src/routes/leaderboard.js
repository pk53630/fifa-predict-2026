// src/routes/leaderboard.js
const express = require('express');
const pool    = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/leaderboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await pool.query(`
      SELECT u.id, u.name,
             COALESCE(SUM(p.points_awarded),0)::int                          AS total_points,
             COUNT(p.id)::int                                                  AS total_predictions,
             SUM(CASE WHEN p.points_awarded > 0 THEN 1 ELSE 0 END)::int       AS correct_winners,
             SUM(CASE WHEN p.points_awarded = 5 THEN 1 ELSE 0 END)::int       AS exact_scores
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY total_points DESC, correct_winners DESC, u.name
      LIMIT $1 OFFSET $2`, [limit, offset]);

    const ranked = rows.map((r, i) => ({
      rank:              offset + i + 1,
      id:                r.id,
      name:              r.name,
      total_points:      r.total_points,
      total_predictions: r.total_predictions,
      correct_winners:   r.correct_winners,
      exact_scores:      r.exact_scores,
      is_me:             r.id === req.user.id,
    }));

    let my_rank = ranked.find(r => r.is_me)?.rank || null;
    if (!my_rank) {
      const all = await pool.query(`
        SELECT u.id, COALESCE(SUM(p.points_awarded),0) AS pts
        FROM users u LEFT JOIN predictions p ON p.user_id=u.id
        WHERE u.role='user' GROUP BY u.id ORDER BY pts DESC`);
      const idx = all.rows.findIndex(r => r.id === req.user.id);
      if (idx !== -1) my_rank = idx + 1;
    }

    res.json({ leaderboard: ranked, my_rank });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
