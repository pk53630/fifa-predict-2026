// src/routes/admin.js
const express = require('express');
const pool    = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             COUNT(p.id)::int                          AS prediction_count,
             COALESCE(SUM(p.points_awarded),0)::int    AS total_points
      FROM users u LEFT JOIN predictions p ON p.user_id=u.id
      GROUP BY u.id ORDER BY u.created_at DESC`);
    res.json({ users: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user','admin'].includes(role))
      return res.status(400).json({ error: 'role must be "user" or "admin"' });
    const { rowCount } = await pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `User ${req.params.id} role updated to ${role}` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, preds, done, remaining, top] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM users WHERE role='user'"),
      pool.query('SELECT COUNT(*)::int AS n FROM predictions'),
      pool.query("SELECT COUNT(*)::int AS n FROM matches WHERE status='done'"),
      pool.query("SELECT COUNT(*)::int AS n FROM matches WHERE status!='done'"),
      pool.query(`SELECT u.name, COALESCE(SUM(p.points_awarded),0)::int AS pts
                  FROM users u LEFT JOIN predictions p ON p.user_id=u.id
                  WHERE u.role='user' GROUP BY u.id ORDER BY pts DESC LIMIT 1`),
    ]);
    res.json({
      total_users:        users.rows[0].n,
      total_predictions:  preds.rows[0].n,
      matches_done:       done.rows[0].n,
      matches_remaining:  remaining.rows[0].n,
      top_user:           top.rows[0] || null,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/admin/rescore/:matchId
router.post('/rescore/:matchId', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM matches WHERE id=$1 AND status='done'", [req.params.matchId]);
    if (!rows.length) return res.status(404).json({ error: 'Match not found or result not yet set' });
    const match = rows[0];
    const actualWinner = match.home_goals > match.away_goals ? match.home_team
                       : match.away_goals > match.home_goals ? match.away_team : 'Draw';

    const preds = await pool.query('SELECT * FROM predictions WHERE match_id=$1', [match.id]);
    for (const p of preds.rows) {
      const winOk   = p.predicted_winner === actualWinner;
      const scoreOk = p.predicted_home === match.home_goals && p.predicted_away === match.away_goals;
      await pool.query('UPDATE predictions SET points_awarded=$1 WHERE id=$2', [winOk?(scoreOk?5:1):0, p.id]);
    }
    res.json({ message: `Rescored ${preds.rows.length} predictions for match ${match.id}` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
