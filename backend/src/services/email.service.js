// Email service (Gmail App Password via nodemailer).
//
// Sends every transactional email SehatLine needs, all in one house style
// (teal/mint, Capital Hospital branding). Each email ships an HTML body AND
// a plain-text alternative — that, plus a proper From display name and a
// clean, link-light layout, is what keeps these landing in the inbox rather
// than spam.
//
// If EMAIL_USER / EMAIL_APP_PASSWORD are not set in .env, nothing crashes —
// the message is logged to the terminal so testing still works.

const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.email.user || !env.email.appPassword) return null;

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: { user: env.email.user, pass: env.email.appPassword },
  });
  return transporter;
}

// ---- Shared house style ----------------------------------------------------
const TEAL = '#0BAA9D';
const TEAL_DARK = '#089082';

// Wrap body content in the branded shell. `accent` tints the header for
// alerts (e.g. red for security). `cta` is an optional { label, note }.
function wrap(title, bodyHtml, opts = {}) {
  const accentTop = opts.accent || TEAL;
  const accentBot = opts.accentDark || TEAL_DARK;
  return `
  <div style="background:#eef4f6;padding:24px 12px">
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:540px;margin:auto;background:#ffffff;border:1px solid #e3edf1;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,${accentTop},${accentBot});padding:24px 26px">
        <h1 style="margin:0;color:#ffffff;font-size:21px;font-weight:800;letter-spacing:0.5px">SEHAT<span style="color:#d8fff6">LINE</span></h1>
        <p style="margin:5px 0 0;color:#e6fbff;font-size:12px">Capital Hospital Digital Healthcare · CDA, G-6/2 Islamabad</p>
      </div>
      <div style="padding:26px;color:#1F2937">
        <h2 style="margin:0 0 14px;font-size:18px;color:#0f2233">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:16px 26px;background:#f4f8fb;color:#94a3b8;font-size:11px;line-height:1.6;text-align:center">
        Capital Hospital (CDA) · G-6/2, Islamabad<br/>
        This is an automated message from SehatLine. Please do not reply to this email.
      </div>
    </div>
  </div>`;
}

// A reusable "pill" line for key details (label + value).
function detailRow(label, value) {
  return `<tr>
    <td style="padding:7px 0;color:#64748b;font-size:13px">${label}</td>
    <td style="padding:7px 0;color:#0f2233;font-size:13px;font-weight:600;text-align:right">${value}</td>
  </tr>`;
}

// Core sender: HTML + plain-text alternative, graceful fallback.
async function send({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n📧 [EMAIL NOT CONFIGURED] → ${to}\n   Subject: ${subject}\n`);
    return { sent: false, fallback: true };
  }
  try {
    await t.sendMail({
      from: env.email.from,
      to,
      subject,
      html,
      text: text || subject,
      replyTo: env.email.user,
    });
    console.log(`📧 Email sent to ${to} — ${subject}`);
    return { sent: true };
  } catch (err) {
    console.log(`\n📧 [EMAIL SEND FAILED: ${err.message.split('\n')[0]}] → ${to} (${subject})\n`);
    return { sent: false, fallback: true, error: err.message };
  }
}

// ── OTP (password reset code) ──────────────────────────────────────────────
async function sendOtpEmail(to, otp) {
  const html = wrap(
    'Your Password Reset Code',
    `<p style="font-size:14px;color:#5A6B7B;margin:0 0 6px">Use the code below to reset your SehatLine password. It expires in 10 minutes.</p>
     <div style="margin:18px 0;padding:18px;text-align:center;background:#EDF7F5;border:1px dashed ${TEAL};border-radius:12px">
       <span style="font-size:32px;font-weight:800;letter-spacing:10px;color:${TEAL_DARK}">${otp}</span>
     </div>
     <p style="font-size:12px;color:#9AA9B8;margin:0">If you didn't request this, you can safely ignore this email — your account is still secure.</p>`
  );
  return send({ to, subject: 'Your SehatLine reset code', html, text: `Your SehatLine password reset code is ${otp}. It expires in 10 minutes.` });
}

// ── Password changed confirmation ──────────────────────────────────────────
async function sendResetSuccessEmail(to, name) {
  const html = wrap(
    'Your Password Was Changed',
    `<p style="font-size:14px;color:#5A6B7B">Hi ${name || 'there'}, your SehatLine password was changed successfully.</p>
     <p style="font-size:14px;color:#5A6B7B">If this was you, no further action is needed.</p>
     <p style="font-size:13px;color:#E5484D;margin-top:16px;font-weight:600">If you did NOT do this, reset your password immediately and contact the hospital help desk.</p>`
  );
  return send({ to, subject: 'Your SehatLine password was changed', html, text: `Hi ${name || 'there'}, your SehatLine password was just changed. If this wasn't you, reset it immediately.` });
}

// ── Welcome (after signup) ─────────────────────────────────────────────────
async function sendWelcomeEmail(to, name) {
  const html = wrap(
    `Welcome, ${name || 'Patient'} 👋`,
    `<p style="font-size:14px;color:#5A6B7B">Your SehatLine account is ready. You can now manage your care at Capital Hospital right from your phone:</p>
     <ul style="font-size:14px;color:#334155;line-height:1.9;padding-left:18px;margin:12px 0">
       <li>Get a Chronic OPD token and track your live queue</li>
       <li>Book cardiology / specialist appointments</li>
       <li>View lab reports with easy-to-read analysis</li>
       <li>Log your vitals and get health insights</li>
       <li>Find free health camps and donate blood</li>
     </ul>
     <p style="font-size:13px;color:#9AA9B8;margin-top:14px">Keep your login details private. We'll never ask for your password by email.</p>`
  );
  return send({ to, subject: 'Welcome to SehatLine — Capital Hospital', html, text: `Welcome to SehatLine, ${name || 'Patient'}! Your account at Capital Hospital is ready.` });
}

// ── Biometric enrolled ─────────────────────────────────────────────────────
async function sendBiometricEmail(to, name) {
  const html = wrap(
    'Biometric Login Enabled',
    `<p style="font-size:14px;color:#5A6B7B">Hi ${name || 'there'}, fingerprint (biometric) login was just enabled on your SehatLine account for this device.</p>
     <p style="font-size:14px;color:#5A6B7B">From now on you can sign in quickly and securely with your fingerprint on this phone.</p>
     <p style="font-size:13px;color:#E5484D;margin-top:16px;font-weight:600">If you did NOT enable this, change your password now — someone may have access to your device.</p>`
  );
  return send({ to, subject: 'Biometric login enabled on your account', html, text: `Hi ${name || 'there'}, biometric login was enabled on your SehatLine account. If this wasn't you, change your password.` });
}

// ── Appointment booked ─────────────────────────────────────────────────────
async function sendAppointmentBookedEmail(to, name, appt = {}) {
  const dept = (appt.department || 'Appointment').replace(/^\w/, (c) => c.toUpperCase());
  const html = wrap(
    'Appointment Confirmed ✅',
    `<p style="font-size:14px;color:#5A6B7B">Hi ${name || 'there'}, your appointment at Capital Hospital is confirmed.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;border-top:1px solid #eef2f5">
       ${detailRow('Department', dept)}
       ${detailRow('Doctor', appt.doctorName || '—')}
       ${detailRow('Date', appt.date || '—')}
       ${detailRow('Time', appt.time || '—')}
     </table>
     <p style="font-size:13px;color:#9AA9B8">Please arrive 10 minutes early. You can view or cancel this appointment anytime in the app.</p>`
  );
  return send({ to, subject: `Appointment confirmed — ${appt.date || ''} ${appt.time || ''}`.trim(), html, text: `Your ${dept} appointment with ${appt.doctorName || 'the doctor'} on ${appt.date} at ${appt.time} is confirmed.` });
}

// ── Appointment cancelled ──────────────────────────────────────────────────
async function sendAppointmentCancelledEmail(to, name, appt = {}) {
  const dept = (appt.department || 'Appointment').replace(/^\w/, (c) => c.toUpperCase());
  const html = wrap(
    'Appointment Cancelled',
    `<p style="font-size:14px;color:#5A6B7B">Hi ${name || 'there'}, the following appointment has been cancelled.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;border-top:1px solid #eef2f5">
       ${detailRow('Department', dept)}
       ${detailRow('Doctor', appt.doctorName || '—')}
       ${detailRow('Date', appt.date || '—')}
       ${detailRow('Time', appt.time || '—')}
     </table>
     <p style="font-size:13px;color:#9AA9B8">You can book a new appointment anytime from the SehatLine app.</p>`,
    { accent: '#F59E0B', accentDark: '#D97706' }
  );
  return send({ to, subject: 'Your appointment was cancelled', html, text: `Your ${dept} appointment on ${appt.date} at ${appt.time} has been cancelled.` });
}

// ── Unusual activity (device / fingerprint mismatch) ───────────────────────
async function sendUnusualActivityEmail(to, name, meta = {}) {
  const when = meta.time || new Date().toLocaleString();
  const html = wrap(
    'Unusual Activity Detected 🔒',
    `<p style="font-size:14px;color:#5A6B7B">Hi ${name || 'there'}, we detected a sign-in attempt on your SehatLine account from a device or fingerprint that doesn't match your registered one. For your safety, that session was signed out automatically.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;border-top:1px solid #eef2f5">
       ${detailRow('When', when)}
       ${meta.ip ? detailRow('IP address', meta.ip) : ''}
       ${meta.device ? detailRow('Device', meta.device) : ''}
     </table>
     <p style="font-size:14px;color:#E5484D;font-weight:700;margin-top:8px">If this wasn't you, please change your password immediately.</p>
     <p style="font-size:13px;color:#9AA9B8;margin-top:6px">If it was you, you can simply sign in again.</p>`,
    { accent: '#E5484D', accentDark: '#B91C1C' }
  );
  return send({ to, subject: '⚠️ Unusual activity on your SehatLine account', html, text: `Unusual activity detected on your SehatLine account at ${when}. The session was logged out. If this wasn't you, change your password immediately.` });
}

// ── Generic branded email (used by test/utility scripts) ───────────────────
// Wraps arbitrary body HTML in the house style (Capital Hospital / CDA look).
async function sendBrandedEmail(to, subject, title, bodyHtml, text, opts = {}) {
  return send({ to, subject, html: wrap(title, bodyHtml, opts), text });
}

module.exports = {
  sendOtpEmail,
  sendResetSuccessEmail,
  sendWelcomeEmail,
  sendBiometricEmail,
  sendAppointmentBookedEmail,
  sendAppointmentCancelledEmail,
  sendUnusualActivityEmail,
  sendBrandedEmail,
};
