// Notification model — anything the patient should see in their bell menu.
//
// Sources: queue/token events, appointment reminders, order updates, and the
// twice-daily health tips.

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: ['health_tip', 'token', 'appointment', 'order', 'report', 'system', 'blood_request', 'medication', 'lab', 'requisition'],
      default: 'system',
      index: true,
    },

    title: { type: String, required: true },
    body: { type: String, default: '' },
    icon: { type: String, default: 'notifications' },   // Ionicons name

    read: { type: Boolean, default: false, index: true },

    // Where tapping the notification should take the patient.
    screen: { type: String, default: '' },

    // Optional id of the entity the notification is about (e.g. a Prescription),
    // passed to the target screen so tapping opens that exact record.
    refId: { type: String, default: '' },

    // Optional source role (doctor/pharmacy/laboratory) — lets the admin filter
    // notifications by which module they came from.
    refRole: { type: String, default: '', index: true },

    // Optional sub-type for announcements (Meeting / Circular / Emergency /
    // Duty / General) — lets staff filter the bell by the kind of notice.
    category: { type: String, default: '' },

    // For health tips: which slot this belongs to, so we never send two
    // morning tips on the same day.
    slot: { type: String, enum: ['morning', 'evening', ''], default: '' },
    slotDate: { type: String, default: '' },            // 'YYYY-MM-DD'

    // Optional auto-expiry (e.g. Loan Prescription valid for 3 days). When set
    // and in the past, MongoDB's TTL job removes the notification.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The bell list is always "mine, newest first".
notificationSchema.index({ user: 1, createdAt: -1 });

// TTL: auto-remove a notification once its expiresAt passes (null = never).
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// One tip per slot per day, per user.
notificationSchema.index(
  { user: 1, slot: 1, slotDate: 1 },
  { unique: true, partialFilterExpression: { slot: { $in: ['morning', 'evening'] } } }
);

module.exports = mongoose.model('Notification', notificationSchema);
