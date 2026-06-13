// src/routes/email.js
// Uses AWS SES API via HTTPS (not SMTP) — works on all hosting including Render free tier.
// SMTP ports are often blocked on cloud hosts; HTTPS API is never blocked.
// Uses @aws-sdk/client-ses package.

const express = require('express');
const pool    = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// ── Build SES client using AWS SDK v3 ────────────────────────────────────────
function getSESClient() {
  const { SESClient } = require('@aws-sdk/client-ses');
  return new SESClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// ── GET /api/email/recent-users?hours=3 ──────────────────────────────────────
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

// ── POST /api/email/test ──────────────────────────────────────────────────────
router.post('/test', async (req, res) => {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return res.status(500).json({
        error: 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY not set in Render environment variables'
      });
    }
    if (!process.env.SES_FROM_EMAIL) {
      return res.status(500).json({
        error: 'SES_FROM_EMAIL not set — add your verified email address'
      });
    }

    const { rows } = await pool.query(
      'SELECT email, name FROM users WHERE id = $1', [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
    const client = getSESClient();

    await client.send(new SendEmailCommand({
      Source: `FIFA Predict 2026 <${process.env.SES_FROM_EMAIL}>`,
      Destination: { ToAddresses: [rows[0].email] },
      Message: {
        Subject: { Data: '✅ FIFA Predict 2026 — Email test successful!' },
        Body: {
          Html: { Data: buildEmailHtml(rows[0].name,
            'This is a test email from your FIFA Predict 2026 admin panel.\n\nAWS SES is configured correctly and emails are working! 🎉\n\nYou can now send emails to all your users.'
          )},
        },
      },
    }));

    res.json({ message: `✅ Test email sent to ${rows[0].email}` });
  } catch (err) {
    console.error('SES test error:', err);
    const hint =
      err.name === 'InvalidClientTokenId'  ? 'AWS_ACCESS_KEY_ID is invalid — check it in Render env vars' :
      err.name === 'SignatureDoesNotMatch'  ? 'AWS_SECRET_ACCESS_KEY is wrong — regenerate in AWS IAM console' :
      err.name === 'MessageRejected'        ? 'Email rejected — your SES account may be in sandbox mode (verify recipient email first)' :
      err.name === 'MailFromDomainNotVerified' ? 'SES_FROM_EMAIL not verified in AWS SES console' :
      err.Code === 'InvalidClientTokenId'   ? 'AWS credentials are invalid' :
      'Check AWS SES console and Render environment variables';
    res.status(500).json({ error: err.message, hint });
  }
});

// ── POST /api/email/send-bulk ─────────────────────────────────────────────────
router.post('/send-bulk', async (req, res) => {
  try {
    const { subject, message, hours = 3, send_to_all = false } = req.body;

    if (!subject || !message)
      return res.status(400).json({ error: 'subject and message are required' });

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
      return res.status(500).json({
        error: 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY not configured in Render environment variables'
      });

    if (!process.env.SES_FROM_EMAIL)
      return res.status(500).json({
        error: 'SES_FROM_EMAIL not configured — add your verified SES email'
      });

    const hoursInt = parseInt(hours);
    const queryStr = send_to_all
      ? `SELECT id, name, email FROM users WHERE role='user' ORDER BY created_at DESC`
      : `SELECT id, name, email FROM users WHERE role='user' AND created_at >= NOW() - INTERVAL '${hoursInt} hours' ORDER BY created_at DESC`;

    const { rows: users } = await pool.query(queryStr);

    if (!users.length)
      return res.json({ message: 'No users found', sent: 0, failed: 0, total: 0 });

    const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
    const client = getSESClient();
    let sent = 0, failed = 0, failedEmails = [];

    for (const user of users) {
      try {
        await client.send(new SendEmailCommand({
          Source: `FIFA Predict 2026 <${process.env.SES_FROM_EMAIL}>`,
          Destination: { ToAddresses: [user.email] },
          Message: {
            Subject: { Data: subject },
            Body: { Html: { Data: buildEmailHtml(user.name, message) } },
          },
        }));
        sent++;
        console.log(`✅ Sent to ${user.email}`);
      } catch (err) {
        console.error(`❌ Failed ${user.email}:`, err.message);
        failed++;
        failedEmails.push(user.email);
      }
      // Respect SES rate limit (14/sec free tier)
      await new Promise(r => setTimeout(r, 200));
    }

    res.json({
      message: `Emails sent: ${sent} successful, ${failed} failed`,
      sent, failed, total: users.length,
      failedEmails: failedEmails.slice(0, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── HTML email template ───────────────────────────────────────────────────────
function buildEmailHtml(name, message) {
  const htmlMsg = message.replace(/\n/g, '<br/>');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#111827,#1a2235);border-radius:12px 12px 0 0;padding:32px;text-align:center;border-bottom:3px solid #f5c842;">
    <div style="font-size:36px;margin-bottom:8px;">🏆</div>
    <h1 style="margin:0;font-size:24px;font-weight:800;color:#f5c842;">FIFA Predict 2026</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#8a94a6;">World Cup Match Prediction Game</p>
  </td></tr>
  <tr><td style="background:#151d2e;padding:32px;border-radius:0 0 12px 12px;">
    <p style="margin:0 0 20px;font-size:16px;color:#f0f0f0;">Hi <strong style="color:#f5c842;">${name}</strong>,</p>
    <div style="font-size:15px;color:#c8cdd6;line-height:1.7;margin-bottom:24px;">${htmlMsg}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="background:#1a2235;border-radius:10px;padding:20px;border:1px solid rgba(245,200,66,.2);">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#f5c842;text-transform:uppercase;">How to earn points</p>
        <table width="100%">
          <tr><td style="padding:6px 0;font-size:13px;color:#8a94a6;">⏰ Predict <strong style="color:#f97316;">1 hour</strong> before kickoff</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:#8a94a6;">⚽ Correct winner or draw = <strong style="color:#60a5fa;">3 pts</strong></td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:#8a94a6;">🎯 Correct result + exact score = <strong style="color:#f5c842;">5 pts</strong></td></tr>
        </table>
      </td></tr>
    </table>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://fifa-predict-2026.netlify.app"
         style="display:inline-block;background:#f5c842;color:#0a0f1e;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
        ⚽ Make Your Predictions Now
      </a>
    </div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:0 0 20px;"/>
    <p style="margin:0;font-size:12px;color:#4a5568;text-align:center;line-height:1.6;">
      You received this because you registered on FIFA Predict 2026.<br/>
      <a href="https://fifa-predict-2026.netlify.app" style="color:#f5c842;text-decoration:none;">fifa-predict-2026.netlify.app</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

module.exports = router;
