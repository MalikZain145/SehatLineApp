// Stateless proof-of-CNIC-verification token.
//
// WHY: our /cnic/verify endpoint used to prove a side "passed" by leaving the
// uploaded image on disk (it deletes the file on reject). That works locally,
// but NOT on serverless (Vercel): /tmp is ephemeral and per-instance, so by the
// time the final /register call runs — possibly on a different instance — the
// image is gone and signup is wrongly rejected with "verify both sides".
//
// Instead, /cnic/verify mints a short-lived HMAC token that /register can
// validate without any shared state. The token proves "this side was verified
// by us, recently" — it carries no file, which is fine because the image can't
// persist on free serverless anyway.

const crypto = require('crypto');
const env = require('../config/env');

const PREFIX = 'cvt1';                       // cnic-verify-token v1
const MAX_AGE_MS = 30 * 60 * 1000;           // token valid for 30 min (finish signup)

function sign(payload) {
  return crypto.createHmac('sha256', env.jwtSecret).update(payload).digest('base64url').slice(0, 43);
}

// Returns a token string like: cvt1.front.1788514394648.<hmac>
function signCnicToken(side) {
  const s = side === 'back' ? 'back' : 'front';
  const ts = Date.now();
  const payload = `${s}.${ts}`;
  return `${PREFIX}.${payload}.${sign(payload)}`;
}

// True only for an untampered, non-expired token whose side matches (when given).
function isValidCnicToken(token, side) {
  if (typeof token !== 'string' || !token.startsWith(`${PREFIX}.`)) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [, tside, ts, sig] = parts;
  const expected = sign(`${tside}.${ts}`);
  if (sig.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch (_) { return false; }
  const age = Date.now() - Number(ts);
  if (!(age >= 0 && age < MAX_AGE_MS)) return false;
  if (side && tside !== side) return false;
  return true;
}

module.exports = { signCnicToken, isValidCnicToken, CNIC_TOKEN_PREFIX: PREFIX };
