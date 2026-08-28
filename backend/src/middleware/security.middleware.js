// Security: prevent NoSQL injection.
// Attackers can send JSON like { "email": { "$gt": "" } } to bypass auth.
// This middleware rejects any request whose body contains object/array values
// where we expect strings (for the auth fields), and strips keys starting
// with '$' or containing '.' anywhere in the body.

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// Recursively remove keys that look like Mongo operators ($gt, $ne, etc.)
function sanitize(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  if (isPlainObject(obj)) {
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) continue; // drop operator keys
      clean[key] = sanitize(obj[key]);
    }
    return clean;
  }
  return obj;
}

// Fields that MUST be strings in auth requests. If any is a non-string
// (e.g. an object for injection), reject the request.
const STRING_FIELDS = ['email', 'phone', 'password', 'newPassword', 'emailOrPhone',
  'cnic', 'cdaCard', 'name', 'dob', 'otp', 'resetTicket', 'fingerprintToken', 'side'];

function noSqlGuard(req, res, next) {
  if (isPlainObject(req.body)) {
    // Reject object-typed values in known string fields
    for (const f of STRING_FIELDS) {
      if (f in req.body && req.body[f] !== undefined && req.body[f] !== null) {
        if (typeof req.body[f] !== 'string') {
          return res.status(400).json({
            success: false,
            code: 'BAD_INPUT',
            message: 'Invalid input format.',
          });
        }
      }
    }
    // Strip any Mongo-operator keys from the whole body
    req.body = sanitize(req.body);
  }

  // Query strings and route params are equally exploitable
  // (e.g. ?email[$gt]= ). qs parses bracketed keys into objects, so an
  // attacker could inject operators through the URL — sanitize those too.
  if (isPlainObject(req.query)) req.query = sanitize(req.query);
  if (isPlainObject(req.params)) req.params = sanitize(req.params);

  next();
}

module.exports = { noSqlGuard, sanitize };
