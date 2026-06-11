// src/routes/matches.js
const express = require('express');
const pool    = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function computeStatus(match) {
  if (match.status === 'done') return 'done';
  const now  = Date.now();
  const kick = new Date(match.kickoff_utc).getTime();
  if (now >= kick && now < kick + 110 * 60 * 1000) return 'live';
  if (now >= kick - 6 * 60 * 60 * 1000)            return 'locked';
  return 'open';
}

function fmt(m) {
  return {
    id:          m.id,
    stage:       m.stage,
    home_team:   m.home_team,
    away_team:   m.away_team,
    kickoff_utc: m.kickoff_utc,
    venue:       m.venue,
    status:      computeStatus(m),
    home_goals:  m.home_goals,
    away_goals:  m.away_goals,
    tbd:         m.tbd,
  };
}

// GET /api/matches
router.get('/', async (req, res) => {
  try {
    const { stage } = req.query;
    const q = stage
      ? await pool.query('SELECT * FROM matches WHERE stage=$1 ORDER BY kickoff_utc', [stage])
      : await pool.query('SELECT * FROM matches ORDER BY kickoff_utc');
    res.json({ matches: q.rows.map(fmt) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/matches/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM matches WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Match not found' });

    const pred = await pool.query(
      'SELECT * FROM predictions WHERE user_id=$1 AND match_id=$2',
      [req.user.id, req.params.id]
    );
    res.json({ match: fmt(rows[0]), prediction: pred.rows[0] || null });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/matches/:id/result  (admin)
router.put('/:id/result', requireAdmin, async (req, res) => {
  try {
    const { home_goals, away_goals } = req.body;
    if (home_goals == null || away_goals == null)
      return res.status(400).json({ error: 'home_goals and away_goals are required' });
    if (!Number.isInteger(home_goals) || !Number.isInteger(away_goals) || home_goals < 0 || away_goals < 0)
      return res.status(400).json({ error: 'Goals must be non-negative integers' });

    const { rows } = await pool.query('SELECT * FROM matches WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Match not found' });
    const match = rows[0];

    const actualWinner = home_goals > away_goals ? match.home_team
                       : away_goals > home_goals ? match.away_team : 'Draw';

    await pool.query(
      "UPDATE matches SET status='done', home_goals=$1, away_goals=$2 WHERE id=$3",
      [home_goals, away_goals, match.id]
    );

    const preds = await pool.query(
      'SELECT * FROM predictions WHERE match_id=$1 AND points_awarded IS NULL',
      [match.id]
    );

    let scored = 0;
    for (const p of preds.rows) {
      const winOk   = p.predicted_winner === actualWinner;
      const scoreOk = p.predicted_home === home_goals && p.predicted_away === away_goals;
      // Scoring: correct result (win or draw) = 3 pts; correct result + exact score = 5 pts
      const pts = winOk ? (scoreOk ? 5 : 3) : 0;
      await pool.query('UPDATE predictions SET points_awarded=$1 WHERE id=$2', [pts, p.id]);
      scored++;
    }

    res.json({ message: `Result saved. ${scored} predictions scored.`, result: { home_goals, away_goals, winner: actualWinner } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/matches/:id/teams  (admin)
router.put('/:id/teams', requireAdmin, async (req, res) => {
  try {
    const { home_team, away_team } = req.body;
    if (!home_team || !away_team)
      return res.status(400).json({ error: 'home_team and away_team are required' });

    const { rowCount } = await pool.query(
      'UPDATE matches SET home_team=$1, away_team=$2, tbd=false WHERE id=$3',
      [home_team, away_team, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Match not found' });
    res.json({ message: 'Teams updated', id: req.params.id, home_team, away_team });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
