// Medication reminders — delivered as notifications, lazily.
//
// When a doctor's prescription is active (issued within the last 30 days, the
// chronic medicine window), the patient gets a reminder for each prescribed
// medicine in each daily slot: morning, afternoon, evening. Like the health
// tips, these are created the first time the patient opens the app inside a
// slot's window — no cron job, no push server. A per-(medicine, slot, day)
// log guarantees each reminder fires exactly once.
//
// This replaces the old "Med Reminders" config screen: the prescription the
// doctor gives IS the schedule, and the app reminds the patient from it.

const Prescription = require('../models/Prescription');
const Notification = require('../models/Notification');
const MedReminderLog = require('../models/MedReminderLog');

const SLOTS = {
  morning: { from: 6, to: 11, label: 'morning', with: 'after breakfast' },
  afternoon: { from: 13, to: 16, label: 'afternoon', with: 'after lunch' },
  evening: { from: 19, to: 22, label: 'evening', with: 'after dinner' },
};

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentSlot(now = new Date()) {
  const h = now.getHours();
  for (const key of Object.keys(SLOTS)) {
    if (h >= SLOTS[key].from && h < SLOTS[key].to) return key;
  }
  return null;
}

// Create due medicine reminders for the slot we're currently in.
// Returns the number of reminders created.
async function deliverDueMedReminders(user) {
  const now = new Date();
  const slot = currentSlot(now);
  if (!slot) return 0;

  const slotDate = todayStr(now);
  const cfg = SLOTS[slot];

  // Active prescriptions = issued within the last 30 days (chronic window).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const prescriptions = await Prescription.find({
    user: user._id,
    createdAt: { $gte: since },
  }).select('_id medicines').lean();

  let created = 0;
  for (const presc of prescriptions) {
    for (const medicine of (presc.medicines || [])) {
      if (!medicine) continue;
      try {
        // The log's unique index is the gate — insert first, notify only if new.
        await MedReminderLog.create({
          user: user._id, prescription: presc._id, medicine, slot, slotDate,
        });
        await Notification.create({
          user: user._id,
          type: 'medication',
          title: `Medicine reminder — ${cfg.label}`,
          body: `Time for your ${medicine}. Please take your dose ${cfg.with}, as prescribed by your doctor.`,
          icon: 'medkit',
          screen: 'NotificationsScreen',
        });
        created += 1;
      } catch (err) {
        // Duplicate = already reminded for this med/slot/day. Expected.
        if (err && err.code === 11000) continue;
        // Any other error: skip this medicine, don't break the whole delivery.
      }
    }
  }
  return created;
}

module.exports = { deliverDueMedReminders, currentSlot, SLOTS };
