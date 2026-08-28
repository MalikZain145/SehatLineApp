// Schema validation middleware (zod).
//
// First-line defense on sensitive endpoints: rejects malformed data, wrong
// types, oversized strings (anti-DoS), and enforces the password policy —
// BEFORE the request reaches business logic. Non-destructive: on success it
// leaves req.body untouched (controllers keep using their explicit field
// allow-lists), so this only adds rejection, never changes existing behavior.

const { z } = require('zod');

// validate(schema, source) → express middleware. source: 'body' | 'query' | 'params'
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const first = result.error.issues?.[0];
      return res.status(400).json({
        success: false,
        code: 'VALIDATION',
        message: first?.message || 'Invalid input.',
      });
    }
    next();
  };
}

// Reject a malformed Mongo ObjectId in a route param (e.g. /:id) early, so a
// bad id returns a clean 400 instead of a CastError bubbling to a 500.
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
function validateObjectId(param = 'id') {
  return (req, res, next) => {
    const val = req.params?.[param];
    if (!val || !OBJECT_ID_RE.test(String(val))) {
      return res.status(400).json({ success: false, code: 'BAD_ID', message: 'Invalid identifier.' });
    }
    next();
  };
}

module.exports = { validate, validateObjectId, z };
