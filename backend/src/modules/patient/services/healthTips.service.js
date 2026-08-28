// Health tips — one in the morning, one in the evening, per patient per day.
//
// Delivery is lazy: the tip is created the first time the patient opens the
// app inside that slot's window. No cron job, no push infrastructure, and a
// patient who never opens the app doesn't accumulate a backlog.
//
// The unique index on (user, slot, slotDate) guarantees exactly one tip per
// slot per day even if two requests race.

const Notification = require('../models/Notification');

// Morning window: 05:00–12:00. Evening window: 17:00–23:00.
// Outside those hours no tip is due.
const MORNING = { from: 5, to: 12 };
const EVENING = { from: 17, to: 23 };

const MORNING_TIPS = [
  { title: 'Start with water', body: 'Drink a glass of water when you wake up — it kick-starts your metabolism.', icon: 'water' },
  { title: 'Move your body', body: 'A 20-minute morning walk lowers blood pressure and lifts your mood.', icon: 'walk' },
  { title: 'Do not skip breakfast', body: 'A balanced breakfast keeps your blood sugar steady through the morning.', icon: 'nutrition' },
  { title: 'Take your medicine', body: 'If your doctor prescribed morning doses, take them with food unless told otherwise.', icon: 'medkit' },
  { title: 'Stretch it out', body: 'Five minutes of stretching eases stiffness and improves circulation.', icon: 'body' },
  { title: 'Check your sugar', body: 'If you are diabetic, a fasting reading each morning helps you spot trends early.', icon: 'pulse' },
  { title: 'Get some sunlight', body: 'Ten minutes of morning sun helps your body make vitamin D.', icon: 'sunny' },
];

const EVENING_TIPS = [
  { title: 'Wind down early', body: 'Put screens away an hour before bed — it helps you fall asleep faster.', icon: 'moon' },
  { title: 'Light dinner, better sleep', body: 'Eat at least two hours before bed so your body can rest, not digest.', icon: 'restaurant' },
  { title: 'Log your vitals', body: 'Recording your blood pressure each evening builds a picture your doctor can use.', icon: 'heart' },
  { title: 'Evening dose reminder', body: 'Check whether any of your medicines are due tonight.', icon: 'alarm' },
  { title: 'Breathe slowly', body: 'Two minutes of slow breathing lowers your heart rate before sleep.', icon: 'leaf' },
  { title: 'Cut the late caffeine', body: 'Tea or coffee after 6 pm can keep you awake long past bedtime.', icon: 'cafe' },
  { title: 'Aim for seven hours', body: 'Consistent sleep does more for recovery than any supplement.', icon: 'bed' },
];

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Which slot, if any, are we currently inside?
function currentSlot(now = new Date()) {
  const h = now.getHours();
  if (h >= MORNING.from && h < MORNING.to) return 'morning';
  if (h >= EVENING.from && h < EVENING.to) return 'evening';
  return null;
}

// Pick a tip deterministically from the day + user, so the same patient sees
// the same tip all morning rather than a new one on every refresh.
function pickTip(pool, userId, dateStr, slot) {
  const seed = `${userId}${dateStr}${slot}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

// Create today's tip for the slot we're in, if it doesn't exist yet.
// Returns the notification, or null when no tip is due.
async function deliverDueTip(user) {
  const now = new Date();
  const slot = currentSlot(now);
  if (!slot) return null;

  const slotDate = todayStr(now);
  const pool = slot === 'morning' ? MORNING_TIPS : EVENING_TIPS;
  const tip = pickTip(pool, String(user._id), slotDate, slot);

  try {
    return await Notification.create({
      user: user._id,
      type: 'health_tip',
      title: tip.title,
      body: tip.body,
      icon: tip.icon,
      slot,
      slotDate,
    });
  } catch (err) {
    // Duplicate key = the tip already exists for this slot today. That's the
    // expected path on every refresh after the first.
    if (err && err.code === 11000) return null;
    throw err;
  }
}

module.exports = { deliverDueTip, currentSlot, todayStr, MORNING_TIPS, EVENING_TIPS };
