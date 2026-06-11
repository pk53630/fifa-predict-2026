// src/db/schema.js
// Creates all tables if they don't exist.
// Called automatically on server startup.

const pool = require('./pool');

async function initSchema() {
  await pool.query(`
    -- ── USERS ────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      name        TEXT        NOT NULL,
      email       TEXT        NOT NULL UNIQUE,
      password    TEXT        NOT NULL,
      role        TEXT        NOT NULL DEFAULT 'user',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ── MATCHES ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS matches (
      id            TEXT PRIMARY KEY,
      stage         TEXT        NOT NULL,
      home_team     TEXT        NOT NULL,
      away_team     TEXT        NOT NULL,
      kickoff_utc   TIMESTAMPTZ NOT NULL,
      venue         TEXT        NOT NULL,
      status        TEXT        NOT NULL DEFAULT 'scheduled',
      home_goals    INTEGER,
      away_goals    INTEGER,
      tbd           BOOLEAN     NOT NULL DEFAULT FALSE
    );

    -- ── PREDICTIONS ──────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS predictions (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id         TEXT        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      predicted_winner TEXT        NOT NULL,
      predicted_home   INTEGER,
      predicted_away   INTEGER,
      points_awarded   INTEGER,
      submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, match_id)
    );

    -- ── INDEXES ──────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_predictions_user  ON predictions(user_id);
    CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
    CREATE INDEX IF NOT EXISTS idx_matches_stage     ON matches(stage);
    CREATE INDEX IF NOT EXISTS idx_matches_status    ON matches(status);
  `);

  console.log('✅  Database schema ready.');
}

module.exports = { initSchema };
