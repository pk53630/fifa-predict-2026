// src/db/seed.js  — run once:  node src/db/seed.js

require('dotenv').config();
const pool = require('./pool');
const { initSchema } = require('./schema');

// ─── PRE-HASHED PASSWORDS (bcryptjs, cost 10) ────────────────────────────────
// Admin password : Admin@2026!
// User password  : User@1234
const ADMIN_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhy';
const USER_HASH  = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

const USERS = [
  { name:'Admin',        email:'admin@fifapredict.com', password: ADMIN_HASH, role:'admin' },
  { name:'Arjun Kumar',  email:'arjun@example.com',     password: USER_HASH,  role:'user'  },
  { name:'Priya Singh',  email:'priya@example.com',     password: USER_HASH,  role:'user'  },
  { name:'Mihail Radu',  email:'mihail@example.com',    password: USER_HASH,  role:'user'  },
  { name:'Sana Patel',   email:'sana@example.com',      password: USER_HASH,  role:'user'  },
  { name:'David Kim',    email:'david@example.com',     password: USER_HASH,  role:'user'  },
];

const MATCHES = [
  // ── GROUP A ──────────────────────────────────────────────────────────────
  { id:'g001', stage:'Group A', home:'Mexico',       away:'South Africa', kickoff:'2026-06-11T19:00:00Z', venue:'Mexico City' },
  { id:'g002', stage:'Group A', home:'South Korea',  away:'Czechia',      kickoff:'2026-06-12T02:00:00Z', venue:'Guadalajara' },
  { id:'g003', stage:'Group A', home:'Czechia',      away:'South Africa', kickoff:'2026-06-18T16:00:00Z', venue:'Atlanta' },
  { id:'g004', stage:'Group A', home:'Mexico',       away:'South Korea',  kickoff:'2026-06-19T01:00:00Z', venue:'Guadalajara' },
  { id:'g005', stage:'Group A', home:'Czechia',      away:'Mexico',       kickoff:'2026-06-25T01:00:00Z', venue:'Mexico City' },
  { id:'g006', stage:'Group A', home:'South Africa', away:'South Korea',  kickoff:'2026-06-25T01:00:00Z', venue:'Monterrey' },
  // ── GROUP B ──────────────────────────────────────────────────────────────
  { id:'g007', stage:'Group B', home:'Canada',        away:'Bosnia & Herz.',   kickoff:'2026-06-12T19:00:00Z', venue:'Toronto' },
  { id:'g008', stage:'Group B', home:'Qatar',         away:'Switzerland',      kickoff:'2026-06-13T19:00:00Z', venue:'San Francisco' },
  { id:'g009', stage:'Group B', home:'Switzerland',   away:'Bosnia & Herz.',   kickoff:'2026-06-18T19:00:00Z', venue:'Los Angeles' },
  { id:'g010', stage:'Group B', home:'Canada',        away:'Qatar',            kickoff:'2026-06-18T22:00:00Z', venue:'Vancouver' },
  { id:'g011', stage:'Group B', home:'Switzerland',   away:'Canada',           kickoff:'2026-06-24T19:00:00Z', venue:'Vancouver' },
  { id:'g012', stage:'Group B', home:'Bosnia & Herz.',away:'Qatar',            kickoff:'2026-06-24T19:00:00Z', venue:'Seattle' },
  // ── GROUP C ──────────────────────────────────────────────────────────────
  { id:'g013', stage:'Group C', home:'Brazil',   away:'Morocco',  kickoff:'2026-06-13T22:00:00Z', venue:'New York/NJ' },
  { id:'g014', stage:'Group C', home:'Haiti',    away:'Scotland', kickoff:'2026-06-14T01:00:00Z', venue:'Boston' },
  { id:'g015', stage:'Group C', home:'France',   away:'Senegal',  kickoff:'2026-06-16T19:00:00Z', venue:'New York/NJ' },
  { id:'g016', stage:'Group C', home:'Norway',   away:'Senegal',  kickoff:'2026-06-22T00:00:00Z', venue:'New York/NJ' },
  { id:'g017', stage:'Group C', home:'Scotland', away:'Morocco',  kickoff:'2026-06-19T22:00:00Z', venue:'Boston' },
  { id:'g018', stage:'Group C', home:'Brazil',   away:'Haiti',    kickoff:'2026-06-20T01:00:00Z', venue:'Philadelphia' },
  { id:'g019', stage:'Group C', home:'Scotland', away:'Brazil',   kickoff:'2026-06-24T22:00:00Z', venue:'Miami' },
  { id:'g020', stage:'Group C', home:'Morocco',  away:'Haiti',    kickoff:'2026-06-24T22:00:00Z', venue:'Atlanta' },
  // ── GROUP D ──────────────────────────────────────────────────────────────
  { id:'g021', stage:'Group D', home:'USA',       away:'Paraguay',   kickoff:'2026-06-13T01:00:00Z', venue:'Los Angeles' },
  { id:'g022', stage:'Group D', home:'Australia', away:'Türkiye',    kickoff:'2026-06-14T04:00:00Z', venue:'Vancouver' },
  { id:'g023', stage:'Group D', home:'USA',       away:'Australia',  kickoff:'2026-06-19T19:00:00Z', venue:'Seattle' },
  { id:'g024', stage:'Group D', home:'Türkiye',   away:'Paraguay',   kickoff:'2026-06-20T00:00:00Z', venue:'San Francisco' },
  { id:'g025', stage:'Group D', home:'Türkiye',   away:'USA',        kickoff:'2026-06-26T02:00:00Z', venue:'Los Angeles' },
  { id:'g026', stage:'Group D', home:'Paraguay',  away:'Australia',  kickoff:'2026-06-26T02:00:00Z', venue:'San Francisco' },
  // ── GROUP E ──────────────────────────────────────────────────────────────
  { id:'g027', stage:'Group E', home:'Germany',     away:'Curaçao',     kickoff:'2026-06-14T17:00:00Z', venue:'Houston' },
  { id:'g028', stage:'Group E', home:'Ivory Coast',  away:'Ecuador',    kickoff:'2026-06-14T23:00:00Z', venue:'Philadelphia' },
  { id:'g029', stage:'Group E', home:'Germany',     away:'Ivory Coast', kickoff:'2026-06-20T20:00:00Z', venue:'Toronto' },
  { id:'g030', stage:'Group E', home:'Ecuador',     away:'Curaçao',     kickoff:'2026-06-20T00:00:00Z', venue:'Kansas City' },
  { id:'g031', stage:'Group E', home:'Ecuador',     away:'Germany',     kickoff:'2026-06-25T20:00:00Z', venue:'New York/NJ' },
  { id:'g032', stage:'Group E', home:'Curaçao',     away:'Ivory Coast', kickoff:'2026-06-25T20:00:00Z', venue:'Philadelphia' },
  // ── GROUP F ──────────────────────────────────────────────────────────────
  { id:'g033', stage:'Group F', home:'Netherlands', away:'Japan',       kickoff:'2026-06-14T20:00:00Z', venue:'Dallas' },
  { id:'g034', stage:'Group F', home:'Sweden',      away:'Tunisia',     kickoff:'2026-06-15T02:00:00Z', venue:'Monterrey' },
  { id:'g035', stage:'Group F', home:'Netherlands', away:'Sweden',      kickoff:'2026-06-20T17:00:00Z', venue:'Houston' },
  { id:'g036', stage:'Group F', home:'Tunisia',     away:'Japan',       kickoff:'2026-06-21T00:00:00Z', venue:'Monterrey' },
  { id:'g037', stage:'Group F', home:'Japan',       away:'Sweden',      kickoff:'2026-06-25T23:00:00Z', venue:'Dallas' },
  { id:'g038', stage:'Group F', home:'Tunisia',     away:'Netherlands', kickoff:'2026-06-25T23:00:00Z', venue:'Kansas City' },
  // ── GROUP G ──────────────────────────────────────────────────────────────
  { id:'g039', stage:'Group G', home:'Spain',    away:'Cabo Verde',   kickoff:'2026-06-15T16:00:00Z', venue:'Atlanta' },
  { id:'g040', stage:'Group G', home:'Spain',    away:'Saudi Arabia', kickoff:'2026-06-21T16:00:00Z', venue:'Atlanta' },
  { id:'g041', stage:'Group G', home:'Congo DR', away:'Uzbekistan',   kickoff:'2026-06-27T23:30:00Z', venue:'Atlanta' },
  // ── GROUP H ──────────────────────────────────────────────────────────────
  { id:'g042', stage:'Group H', home:'Argentina', away:'Albania',  kickoff:'2026-06-15T22:00:00Z', venue:'Miami' },
  { id:'g043', stage:'Group H', home:'Argentina', away:'Chile',    kickoff:'2026-06-21T22:00:00Z', venue:'Dallas' },
  { id:'g044', stage:'Group H', home:'England',   away:'Panama',   kickoff:'2026-06-27T22:00:00Z', venue:'New York/NJ' },
  // ── GROUP I ──────────────────────────────────────────────────────────────
  { id:'g045', stage:'Group I', home:'Portugal', away:'Angola',  kickoff:'2026-06-16T18:00:00Z', venue:'Kansas City' },
  { id:'g046', stage:'Group I', home:'Portugal', away:'IR Iran', kickoff:'2026-06-22T18:00:00Z', venue:'Boston' },
  // ── GROUP J ──────────────────────────────────────────────────────────────
  { id:'g047', stage:'Group J', home:'England', away:'Croatia', kickoff:'2026-06-17T01:00:00Z', venue:'Dallas' },
  { id:'g048', stage:'Group J', home:'England', away:'Ghana',   kickoff:'2026-06-23T01:00:00Z', venue:'Boston' },
  // ── GROUP K ──────────────────────────────────────────────────────────────
  { id:'g049', stage:'Group K', home:'Colombia', away:'Uzbekistan', kickoff:'2026-06-17T16:00:00Z', venue:'Mexico City' },
  { id:'g050', stage:'Group K', home:'Colombia', away:'Nigeria',    kickoff:'2026-06-23T22:00:00Z', venue:'Guadalajara' },
  // ── GROUP L ──────────────────────────────────────────────────────────────
  { id:'g051', stage:'Group L', home:'Ghana',   away:'Panama', kickoff:'2026-06-18T04:00:00Z', venue:'Toronto' },
  { id:'g052', stage:'Group L', home:'Uruguay', away:'Iraq',   kickoff:'2026-06-23T19:00:00Z', venue:'Philadelphia' },
  // ── ROUND OF 32 ──────────────────────────────────────────────────────────
  { id:'r32_01', stage:'Round of 32', home:'1A', away:'3B/C/D',  kickoff:'2026-06-28T16:00:00Z', venue:'Dallas',        tbd:true },
  { id:'r32_02', stage:'Round of 32', home:'1B', away:'3A/C/D',  kickoff:'2026-06-28T20:00:00Z', venue:'Kansas City',   tbd:true },
  { id:'r32_03', stage:'Round of 32', home:'1C', away:'3A/B/D',  kickoff:'2026-06-29T16:00:00Z', venue:'Seattle',       tbd:true },
  { id:'r32_04', stage:'Round of 32', home:'2C', away:'2D',      kickoff:'2026-06-29T20:00:00Z', venue:'San Francisco', tbd:true },
  { id:'r32_05', stage:'Round of 32', home:'1E', away:'3F/G/H',  kickoff:'2026-06-30T16:00:00Z', venue:'Houston',       tbd:true },
  { id:'r32_06', stage:'Round of 32', home:'1F', away:'3D/E/H',  kickoff:'2026-06-30T20:00:00Z', venue:'Miami',         tbd:true },
  { id:'r32_07', stage:'Round of 32', home:'1G', away:'2G',      kickoff:'2026-07-01T16:00:00Z', venue:'Atlanta',       tbd:true },
  { id:'r32_08', stage:'Round of 32', home:'1H', away:'2H',      kickoff:'2026-07-01T20:00:00Z', venue:'Los Angeles',   tbd:true },
  { id:'r32_09', stage:'Round of 32', home:'1I', away:'3J/K/L',  kickoff:'2026-07-02T16:00:00Z', venue:'Philadelphia',  tbd:true },
  { id:'r32_10', stage:'Round of 32', home:'1J', away:'3G/I/L',  kickoff:'2026-07-02T20:00:00Z', venue:'Boston',        tbd:true },
  { id:'r32_11', stage:'Round of 32', home:'1K', away:'2K',      kickoff:'2026-07-03T16:00:00Z', venue:'Toronto',       tbd:true },
  { id:'r32_12', stage:'Round of 32', home:'1L', away:'2L',      kickoff:'2026-07-03T20:00:00Z', venue:'Vancouver',     tbd:true },
  // ── ROUND OF 16 ──────────────────────────────────────────────────────────
  { id:'r16_01', stage:'Round of 16', home:'W R32-1',  away:'W R32-2',  kickoff:'2026-07-04T16:00:00Z', venue:'Dallas',      tbd:true },
  { id:'r16_02', stage:'Round of 16', home:'W R32-3',  away:'W R32-4',  kickoff:'2026-07-04T20:00:00Z', venue:'Miami',       tbd:true },
  { id:'r16_03', stage:'Round of 16', home:'W R32-5',  away:'W R32-6',  kickoff:'2026-07-05T16:00:00Z', venue:'Houston',     tbd:true },
  { id:'r16_04', stage:'Round of 16', home:'W R32-7',  away:'W R32-8',  kickoff:'2026-07-05T20:00:00Z', venue:'Atlanta',     tbd:true },
  { id:'r16_05', stage:'Round of 16', home:'W R32-9',  away:'W R32-10', kickoff:'2026-07-06T16:00:00Z', venue:'Los Angeles', tbd:true },
  { id:'r16_06', stage:'Round of 16', home:'W R32-11', away:'W R32-12', kickoff:'2026-07-06T20:00:00Z', venue:'Boston',      tbd:true },
  { id:'r16_07', stage:'Round of 16', home:'TBD',      away:'TBD',      kickoff:'2026-07-07T16:00:00Z', venue:'Atlanta',     tbd:true },
  { id:'r16_08', stage:'Round of 16', home:'TBD',      away:'TBD',      kickoff:'2026-07-07T20:00:00Z', venue:'Vancouver',   tbd:true },
  // ── QUARTERFINALS ────────────────────────────────────────────────────────
  { id:'qf_01', stage:'Quarterfinals', home:'W R16-1', away:'W R16-2', kickoff:'2026-07-09T20:00:00Z', venue:'Boston',      tbd:true },
  { id:'qf_02', stage:'Quarterfinals', home:'W R16-3', away:'W R16-4', kickoff:'2026-07-10T19:00:00Z', venue:'Los Angeles', tbd:true },
  { id:'qf_03', stage:'Quarterfinals', home:'W R16-5', away:'W R16-6', kickoff:'2026-07-11T21:00:00Z', venue:'Miami',       tbd:true },
  { id:'qf_04', stage:'Quarterfinals', home:'W R16-7', away:'W R16-8', kickoff:'2026-07-12T01:00:00Z', venue:'Kansas City', tbd:true },
  // ── SEMIFINALS ───────────────────────────────────────────────────────────
  { id:'sf_01', stage:'Semifinals', home:'W QF-1', away:'W QF-2', kickoff:'2026-07-14T23:00:00Z', venue:'Dallas',      tbd:true },
  { id:'sf_02', stage:'Semifinals', home:'W QF-3', away:'W QF-4', kickoff:'2026-07-15T23:00:00Z', venue:'New York/NJ', tbd:true },
  // ── THIRD PLACE + FINAL ───────────────────────────────────────────────────
  { id:'tp_01', stage:'Third place', home:'L SF-1', away:'L SF-2', kickoff:'2026-07-18T20:00:00Z', venue:'Miami',       tbd:true },
  { id:'final', stage:'Final',       home:'W SF-1', away:'W SF-2', kickoff:'2026-07-19T19:00:00Z', venue:'New York/NJ', tbd:true },
];

async function seed() {
  await initSchema();

  // Users
  for (const u of USERS) {
    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, u.password, u.role]
    );
  }

  // Matches
  for (const m of MATCHES) {
    await pool.query(
      `INSERT INTO matches (id, stage, home_team, away_team, kickoff_utc, venue, tbd)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.stage, m.home, m.away, m.kickoff, m.venue, m.tbd || false]
    );
  }

  console.log('\n✅  Database seeded!\n');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│              USER CREDENTIALS                  │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│  ADMIN                                          │');
  console.log('│  Email   : admin@fifapredict.com                │');
  console.log('│  Password: Admin@2026!                          │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│  SAMPLE USERS  — password: User@1234            │');
  console.log('│  arjun@example.com  · priya@example.com         │');
  console.log('│  mihail@example.com · sana@example.com          │');
  console.log('│  david@example.com                              │');
  console.log('└─────────────────────────────────────────────────┘\n');

  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
