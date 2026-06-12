// src/routes/email.js
// POST /api/email/send-bulk   — admin sends email to recent/all users
// GET  /api/email/recent-users — get users registered in last N hours

const express = require('express');
const pool    = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// ── GET /api/email/recent-users?hours=3 ──────────────────────────────────────
// Returns users registered in the last N hours
router.get('/recent-users', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 3;
    const { rows } = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE role = 'user'
         AND created_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY created_at DESC`
    );
    res.json({ users: rows, hours, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/email/send-bulk ─────────────────────────────────────────────────
// Body: { subject, message, hours (optional, default=3), send_to_all (optional) }
// Sends email to users registered in last N hours (or all users if send_to_all=true)
router.post('/send-bulk', async (req, res) => {
  try {
    const { subject, message, hours = 3, send_to_all = false } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'subject and message are required' });
    }
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured in environment variables' });
    }

    // Fetch target users
    let query, params;
    if (send_to_all) {
      query  = `SELECT id, name, email FROM users WHERE role = 'user' ORDER BY created_at DESC`;
      params = [];
    } else {
      query  = `SELECT id, name, email FROM users WHERE role = 'user' AND created_at >= NOW() - INTERVAL '${parseInt(hours)} hours' ORDER BY created_at DESC`;
      params = [];
    }

    const { rows: users } = await pool.query(query, params);

    if (!users.length) {
      return res.json({ message: 'No users found for the selected criteria', sent: 0, failed: 0 });
    }

    // Send emails via Resend API (one by one to personalize)
    let sent = 0, failed = 0, failedEmails = [];

    for (const user of users) {
      const personalizedHtml = buildEmailHtml(user.name, message);
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from:    process.env.EMAIL_FROM || 'FIFA Predict 2026 <onboarding@resend.dev>',
            to:      [user.email],
            subject: subject,
            html:    personalizedHtml,
          }),
        });

        if (response.ok) {
          sent++;
        } else {
          const err = await response.json();
          console.error(`Failed to send to ${user.email}:`, err);
          failed++;
          failedEmails.push(user.email);
        }

        // Small delay to respect rate limits (100/day on free plan)
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        console.error(`Error sending to ${user.email}:`, err.message);
        failed++;
        failedEmails.push(user.email);
      }
    }

    res.json({
      message: `Emails sent: ${sent} successful, ${failed} failed`,
      sent,
      failed,
      total: users.length,
      failedEmails: failedEmails.slice(0, 10), // show first 10 only
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── HTML email template ───────────────────────────────────────────────────────
function buildEmailHtml(name, message) {
  // Convert line breaks to <br> for HTML
  const htmlMessage = message.replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>FIFA Predict 2026</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#111827,#1a2235);border-radius:12px 12px 0 0;padding:32px;text-align:center;border-bottom:3px solid #f5c842;">
            <div style="font-size:36px;margin-bottom:8px;">🏆</div>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#f5c842;letter-spacing:-0.5px;">FIFA Predict 2026</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#8a94a6;">World Cup Match Prediction Game</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#151d2e;padding:32px;border-radius:0 0 12px 12px;">

            <!-- Greeting -->
            <p style="margin:0 0 20px;font-size:16px;color:#f0f0f0;">Hi <strong style="color:#f5c842;">${name}</strong>,</p>

            <!-- Message -->
            <div style="font-size:15px;color:#c8cdd6;line-height:1.7;margin-bottom:24px;">${htmlMessage}</div>

            <!-- Points reminder box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#1a2235;border-radius:10px;padding:20px;border:1px solid rgba(245,200,66,.2);">
                  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#f5c842;text-transform:uppercase;letter-spacing:.05em;">How to earn points</p>
                  <table width="100%">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#8a94a6;">⏰ Predict <strong style="color:#f97316;">1 hour</strong> before kickoff</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#8a94a6;">⚽ Correct winner or draw = <strong style="color:#60a5fa;">3 pts</strong></td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#8a94a6;">🎯 Correct result + exact score = <strong style="color:#f5c842;">5 pts</strong></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://fifa-predict-2026.netlify.app"
                 style="display:inline-block;background:#f5c842;color:#0a0f1e;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:.02em;">
                ⚽ Make Your Predictions Now
              </a>
            </div>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:0 0 20px;"/>

            <!-- Footer -->
            <p style="margin:0;font-size:12px;color:#4a5568;text-align:center;line-height:1.6;">
              You received this because you registered on FIFA Predict 2026.<br/>
              <a href="https://fifa-predict-2026.netlify.app" style="color:#f5c842;text-decoration:none;">fifa-predict-2026.netlify.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = router;
