// src/server.js
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { initSchema } = require('./db/schema');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
    next();
  });
}

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/matches',     require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin',       require('./routes/admin'));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

// Init DB schema, then start listening
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n⚽  FIFA Predict 2026 API`);
      console.log(`   Listening on  http://localhost:${PORT}`);
      console.log(`   Environment   ${process.env.NODE_ENV || 'development'}\n`);
    });
  })
  .catch(err => { console.error('Failed to init DB schema:', err); process.exit(1); });
