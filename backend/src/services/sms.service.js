// SMS service.
// Default provider: Textbelt (has a free tier for testing).
//   - key "textbelt" = 1 free SMS/day (US numbers) for quick testing.
//   - For real use, buy a key or swap in another provider below.
//
// Node 18+ has global fetch built in, so no extra HTTP library is needed.
// If SMS fails or isn't configured, we log the OTP to the terminal so the
// forgot-password flow is still fully testable (email also carries the OTP).

const env = require('../config/env');

// Normalize a Pakistani number to E.164-ish (+92...).
function normalizePkNumber(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d+]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) p = p.slice(1);
  if (p.startsWith('92')) return `+${p}`;
  return `+92${p}`;
}

async function sendViaTextbelt(phone, message) {
  const res = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      message,
      key: env.sms.textbeltKey,
    }),
  });
  return res.json(); // { success, quotaRemaining, error? }
}

async function sendOtpSms(phone, otp) {
  const to = normalizePkNumber(phone);
  const message = `SehatLine: your password reset code is ${otp}. It expires in 10 minutes.`;

  try {
    if (env.sms.provider === 'textbelt') {
      const result = await sendViaTextbelt(to, message);
      if (result.success) {
        console.log(`📱 OTP SMS sent to ${to} (Textbelt quota left: ${result.quotaRemaining})`);
        return { sent: true };
      }
      console.log(`\n📱 [SMS FALLBACK] Textbelt could not send (${result.error || 'unknown'}). OTP for ${to} → ${otp}\n`);
      return { sent: false, fallback: true, error: result.error };
    }

    // Unknown provider → fallback
    console.log(`\n📱 [SMS FALLBACK] Provider "${env.sms.provider}" not implemented. OTP for ${to} → ${otp}\n`);
    return { sent: false, fallback: true };
  } catch (err) {
    console.log(`\n📱 [SMS FALLBACK] SMS error (${err.message}). OTP for ${to} → ${otp}\n`);
    return { sent: false, fallback: true, error: err.message };
  }
}

module.exports = { sendOtpSms, normalizePkNumber };
