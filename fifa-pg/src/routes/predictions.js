// src/routes/predictions.js
const express = require('express');
const pool    = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const SIX_HOURS_MS = 1 * 60 * 60 * 1000;

// POST /api/predictions
router.post('/', requireAuth, async (req, res) => {
  try {
    const { match_id, predicted_winner, predicted_home, predicted_away } = req.body;
    if (!match_id || !predicted_winner)
      return res.status(400).json({ error: 'match_id and predicted_winner are required' });

    const { rows } = await pool.query('SELECT * FROM matches WHERE id=$1', [match_id]);
    if (!rows.length) return res.status(404).json({ error: 'Match not found' });
    const match = rows[0];

    if (Date.now() >= new Date(match.kickoff_utc).getTime() - SIX_HOURS_MS)
      return res.status(403).json({ error: 'Prediction window closed — less than 1 hour to kickoff' });

    const valid = [match.home_team, match.away_team, 'Draw'];
    if (!valid.includes(predicted_winner))
      return res.status(400).json({ error: `predicted_winner must be one of: ${valid.join(', ')}` });

    const hasScore = predicted_home != null && predicted_away != null;
    if (hasScore) {
      if (!Number.isInteger(predicted_home) || !Number.isInteger(predicted_away) || predicted_home < 0 || predicted_away < 0)
        return res.status(400).json({ error: 'Predicted goals must be non-negative integers' });
      if (predicted_winner === match.home_team && predicted_home <= predicted_away)
        return res.status(400).json({ error: 'Score must reflect your winner pick' });
      if (predicted_winner === match.away_team && predicted_away <= predicted_home)
        return res.status(400).json({ error: 'Score must reflect your winner pick' });
      if (predicted_winner === 'Draw' && predicted_home !== predicted_away)
        return res.status(400).json({ error: 'For a draw, home and away goals must be equal' });
    }

    const result = await pool.query(
      `INSERT INTO predictions (user_id, match_id, predicted_winner, predicted_home, predicted_away)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, match_id) DO UPDATE SET
         predicted_winner = EXCLUDED.predicted_winner,
         predicted_home   = EXCLUDED.predicted_home,
         predicted_away   = EXCLUDED.predicted_away,
         points_awarded   = NULL,
         submitted_at     = NOW()
       RETURNING *`,
      [req.user.id, match_id, predicted_winner,
       hasScore ? predicted_home : null,
       hasScore ? predicted_away : null]
    );
    res.status(201).json({ prediction: result.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/predictions/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*,
             m.stage, m.home_team, m.away_team, m.kickoff_utc, m.venue,
             m.home_goals AS result_home, m.away_goals AS result_away,
             m.status AS match_status
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      WHERE p.user_id = $1
      ORDER BY m.kickoff_utc`, [req.user.id]);

    const totalPoints    = rows.reduce((s,r) => s + (r.points_awarded||0), 0);
    const correctWinners = rows.filter(r => r.points_awarded != null && r.points_awarded > 0).length;
    const exactScores    = rows.filter(r => r.points_awarded === 5).length;
    const pending        = rows.filter(r => r.points_awarded == null).length;

    res.json({
      summary: { totalPoints, correctWinners, exactScores, pending, total: rows.length },
      predictions: rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/predictions/match/:id  (admin)
router.get('/match/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, u.name AS user_name, u.email AS user_email
      FROM predictions p
      JOIN users u ON u.id = p.user_id
      WHERE p.match_id = $1 ORDER BY p.submitted_at`, [req.params.id]);
    res.json({ predictions: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
