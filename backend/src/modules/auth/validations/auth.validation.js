// Simple, dependency-free validators. Each returns an array of error
// strings (empty array = valid). Controllers return the first error.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only allow real, common email providers — blocks typos like "gnail.com"
// and fake domains. Add more here if your users need them.
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
];

// Returns true if the email's domain is in the allowed list.
function isAllowedEmailDomain(email) {
  if (!email || !EMAIL_RE.test(email)) return false;
  const domain = email.split('@')[1].toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

function validateSignup(body) {
  const errors = [];
  const { name, email, password, cnic, phone } = body;

  if (!name || name.trim().length < 3) errors.push('Name must be at least 3 characters');
  if (!email || !EMAIL_RE.test(email)) {
    errors.push('A valid email is required');
  } else if (!isAllowedEmailDomain(email)) {
    errors.push('Please use a valid email provider (gmail.com, yahoo.com, outlook.com, etc.)');
  }
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');

  if (cnic) {
    const clean = String(cnic).replace(/-/g, '');
    if (clean.length !== 13) errors.push('CNIC must be 13 digits');
  } else {
    errors.push('CNIC is required');
  }

  if (phone) {
    const clean = String(phone).replace(/^0+/, '').replace(/\D/g, '');
    if (clean.length !== 10) errors.push('Phone must be 10 digits (without leading 0)');
  }

  return errors;
}

function validateLogin(body) {
  const errors = [];
  const { emailOrPhone, password } = body;
  if (!emailOrPhone || typeof emailOrPhone !== 'string') errors.push('Email or phone is required');
  if (!password || typeof password !== 'string') errors.push('Password is required');
  return errors;
}

function validateForgotRequest(body) {
  const errors = [];
  const { email, phone } = body;
  if (!email && !phone) errors.push('Email or phone is required');
  if (email && !EMAIL_RE.test(email)) errors.push('Enter a valid email');
  else if (email && !isAllowedEmailDomain(email)) {
    errors.push('Please use a valid email provider (gmail.com, yahoo.com, etc.)');
  }
  return errors;
}

module.exports = { validateSignup, validateLogin, validateForgotRequest, isAllowedEmailDomain, ALLOWED_EMAIL_DOMAINS, EMAIL_RE };
