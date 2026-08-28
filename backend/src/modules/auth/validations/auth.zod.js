// Zod schemas for the sensitive auth endpoints. These run as a first-line
// guard (see middleware/validate.js) in front of the existing controller-level
// validators. Length caps protect against oversized-string DoS; the password
// policy is enforced only where a NEW password is being SET (signup / reset /
// change) — never on login, so existing users are never locked out.

const { z } = require('zod');

// Strong-password policy: 8–128 chars, at least one letter and one digit.
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

// Login only checks presence + a sane max length (no policy — would lock out
// existing accounts whose password predates the policy).
const anyPassword = z.string().min(1, 'Password is required').max(128, 'Password is too long');

const email = z.string().trim().toLowerCase().email('Enter a valid email').max(254);
const otp = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

const signupSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(80),
  email,
  password: strongPassword,
  cnic: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  dob: z.string().max(40).optional(),
  cdaCard: z.string().max(40).optional(),
}).passthrough(); // keep any extra fields the controller already handles

const loginSchema = z.object({
  emailOrPhone: z.string().trim().min(1, 'Email or phone is required').max(254),
  password: anyPassword,
}).passthrough();

const forgotRequestSchema = z.object({
  email: email.optional(),
  phone: z.string().max(20).optional(),
}).passthrough().refine((d) => d.email || d.phone, { message: 'Email or phone is required' });

const forgotVerifySchema = z.object({
  email: email.optional(),
  phone: z.string().max(20).optional(),
  otp,
}).passthrough();

const forgotResetSchema = z.object({
  email: email.optional(),
  phone: z.string().max(20).optional(),
  resetTicket: z.string().min(10, 'Invalid reset ticket').max(200),
  newPassword: strongPassword,
}).passthrough();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128).optional(),
  oldPassword: z.string().min(1).max(128).optional(),
  newPassword: strongPassword,
}).passthrough();

module.exports = {
  signupSchema, loginSchema, forgotRequestSchema, forgotVerifySchema,
  forgotResetSchema, changePasswordSchema,
};
