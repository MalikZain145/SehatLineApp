// Email validation shared across auth screens.
// Keep the allowed-domains list in sync with the backend
// (backend/src/modules/auth/validations/auth.validation.js).

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
];

// Returns an error string, or '' if the email is valid & from an allowed domain.
export function validateEmailAddress(email) {
  if (!email) return 'Email is required';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email';
  const domain = email.split('@')[1].toLowerCase();
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return 'Use a valid provider (gmail.com, yahoo.com, outlook.com…)';
  }
  return '';
}

export default { validateEmailAddress, EMAIL_RE, ALLOWED_EMAIL_DOMAINS };
