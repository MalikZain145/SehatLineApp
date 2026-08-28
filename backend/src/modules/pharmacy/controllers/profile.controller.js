// Pharmacy → pharmacist's own profile (view + edit, incl. profile photo).

const User = require('../../auth/models/User');

async function getProfile(req, res) {
  return res.json({ success: true, profile: req.user.toSafeJSON() });
}

async function updateProfile(req, res, next) {
  try {
    // NOTE: 'shift' is intentionally excluded — the pharmacy shift is fixed
    // (8:00 AM – 2:00 PM) and must not be editable from the app.
    const allowed = ['name', 'phone', 'profilePic', 'department', 'hospital', 'employeeId', 'counterNumber'];
    const doc = await User.findById(req.user._id);
    for (const k of allowed) if (req.body[k] !== undefined) doc[k] = req.body[k];
    await doc.save();
    return res.json({ success: true, message: 'Profile updated', profile: doc.toSafeJSON() });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile };
