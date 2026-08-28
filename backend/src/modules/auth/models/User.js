// User model.
// ONE collection holds everyone, separated by `role`:
//   - patient   → created via the signup form in the app
//   - doctor    → seeded (hardcoded) by seed/seed.js
//   - admin     → seeded
//   - laboratory→ seeded
//   - pharmacy  → seeded
//
// Patients carry extra fields (CNIC, CDA card, DOB, CNIC images).
// Staff accounts only need name/email/password/role.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['patient', 'doctor', 'admin', 'laboratory', 'pharmacy'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Stored hashed, never plain.
    password: { type: String, required: true, select: false },

    phone: { type: String, trim: true, default: '' },

    role: { type: String, enum: ROLES, default: 'patient', index: true },

    // ---- Doctor-only link ----
    // For role 'doctor': ties this login account to its row in the Doctor
    // collection (e.g. 'cardio_1', 'chronic_endo') so the doctor's own panel
    // can show their appointments/queue.
    doctorId: { type: String, trim: true, default: '', index: true },
    // On/off duty for a doctor account. Mirrored onto the linked Doctor row (if
    // any) so patient booking hides off-duty doctors; kept here too so accounts
    // without a bookable Doctor row still have a working duty status.
    onDuty: { type: Boolean, default: true },
    specialization: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    // Editable doctor profile fields (persist across logout — set from the
    // doctor's Edit Profile screen).
    designation: { type: String, trim: true, default: '' },
    employeeId: { type: String, trim: true, default: '' },
    hospital: { type: String, trim: true, default: '' },
    // Pharmacist's physical service counter (e.g. "3"). When they serve a
    // patient, the patient is directed to THIS counter automatically.
    counterNumber: { type: String, trim: true, default: '' },
    room: { type: String, trim: true, default: '' },
    qualification: { type: String, trim: true, default: '' },
    experience: { type: String, trim: true, default: '' },
    pmdcRegistration: { type: String, trim: true, default: '' },
    workingHours: { type: String, trim: true, default: '' },
    shift: { type: String, trim: true, default: '' },   // pharmacist/lab shift

    // ---- Patient-only fields ----
    cnic: { type: String, trim: true, default: '' },          // 13 digits (with dashes)
    cdaCard: { type: String, trim: true, default: '' },       // e.g. 1234-RB
    dob: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },

    // Paths to captured CNIC images (front/back) stored under /uploads
    cnicFrontImage: { type: String, default: '' },
    cnicBackImage: { type: String, default: '' },

    // CNIC verification (real-time OCR check result at capture time)
    cnicVerified: { type: Boolean, default: false },
    cnicUploadedAt: { type: Date },       // when CNIC was uploaded (for auto-verify)

    // User preferences (synced across devices)
    preferences: {
      darkMode: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
      autoSync: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
    },

    // Doctor workspace settings (synced across devices).
    doctorSettings: {
      notifications: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      queueUpdates: { type: Boolean, default: true },
      consultationDuration: { type: String, default: '15' },
      notesTemplate: { type: String, default: 'General Checkup' },
      autoSaveNotes: { type: Boolean, default: true },
      acceptEmergency: { type: Boolean, default: true },
    },

    // Profile picture (base64 data URI or URL)
    profilePic: { type: String, default: '' },

    // Expo push tokens (one per device the user is signed in on). Used to
    // deliver notifications while the app is closed. Cleared on logout.
    pushTokens: { type: [String], default: [] },

    // Editable profile details (not identity — those are locked after signup).
    bloodGroup: { type: String, default: '' },        // e.g. 'O+'
    emergencyName: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },

    // Biometric login
    biometricEnabled: { type: Boolean, default: false },

    // Forgot-password throttling: max 3 requests per rolling 24 hours.
    // (Per-account, so it can't be bypassed by changing IP.)
    resetRequests: {
      count: { type: Number, default: 0 },
      windowStart: { type: Date },   // when the current 24h window began
    },

    // Chronic/critical conditions (used for token priority: heart, diabetes...)
    // Medical details the patient maintains themselves. chronicConditions
    // also feeds the queue's priority scoring, so it isn't purely cosmetic.
    chronicConditions: { type: [String], default: [] },
    // Whether this patient is approved for the Chronic OPD. Set by an admin
    // (or a doctor). Only chronic patients can use the Chronic OPD.
    isChronic: { type: Boolean, default: false, index: true },
    allergies: { type: [String], default: [] },
    isPregnant: { type: Boolean, default: false },
    hasDisability: { type: Boolean, default: false },

    // ---- Blood Donor Network ----
    // Opt-in only, and gated on cnicVerified at signup time in the
    // controller — a donor list is only useful if it's trustworthy.
    donor: {
      optedIn: { type: Boolean, default: false },
      city: { type: String, trim: true, default: '' },
      lastDonationAt: { type: Date },
    },

    // ---- Session / security ----
    // Hash of the enrolled fingerprint credential id for THIS device.
    // If a login arrives with a different fingerprint hash, the app logs out.
    fingerprintHash: { type: String, default: '', select: false },

    isVerified: { type: Boolean, default: false }, // account verified (KYC) flag

    // Staff created in bulk get a shared default password. Until they set their
    // own, the app forces a blocking "change your password" step at login.
    mustChangePassword: { type: Boolean, default: false },

    accountStatus: {
      type: String,
      // 'deactivated' is self-service and reversible on next sign-in;
      // 'suspended' is applied by staff and is not.
      enum: ['active', 'suspended', 'pending', 'deactivated'],
      default: 'active',
    },

    lastLoginAt: { type: Date },
    lastLoginIp: { type: String, default: '' },

    // Presence heartbeat. Updated whenever a pharmacist polls their live
    // queue/dashboard, so the prescription load-balancer can tell which
    // pharmacists are actually online right now (not just seeded accounts).
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

// Hash password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plain password against the stored hash.
userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

// Never leak sensitive fields when converting to JSON.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.fingerprintHash;
  delete obj.pushTokens;   // device push tokens are internal, never sent to clients
  delete obj.__v;
  return obj;
};

userSchema.statics.ROLES = ROLES;

// Indexes for fast lookups (login, duplicate checks). email already unique.
// Identity fields must be unique across accounts — one person, one account.
// `partialFilterExpression` skips empty strings, so staff accounts (which
// have no CNIC/card) don't collide with each other on ''.
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $gt: '' } } }
);
userSchema.index(
  { cnic: 1 },
  { unique: true, partialFilterExpression: { cnic: { $gt: '' } } }
);
userSchema.index(
  { cdaCard: 1 },
  { unique: true, partialFilterExpression: { cdaCard: { $gt: '' } } }
);

module.exports = mongoose.model('User', userSchema);
