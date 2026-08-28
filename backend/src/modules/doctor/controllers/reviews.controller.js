// Doctor REVIEWS — powers DoctorReviewsScreen.
//   GET /api/doctor/reviews → the reviews/ratings patients left for THIS
//   logged-in doctor (matched by doctorId), newest first, plus average +
//   star breakdown. Each doctor sees only their own feedback.

const User = require('../../auth/models/User');
const DoctorFeedback = require('../../patient/models/DoctorFeedback');
const { notifyUser } = require('../../patient/controllers/notification.controller');
const { fail } = require('../services/doctor.service');

async function getReviews(req, res, next) {
  try {
    const doctorId = req.user.doctorId || '';
    const query = doctorId ? { doctorId } : { doctorName: req.user.name };
    const rows = await DoctorFeedback.find(query).sort({ createdAt: -1 }).limit(100).lean();

    const reviews = await Promise.all(rows.map(async (r) => {
      const u = await User.findById(r.user).select('name').lean();
      return {
        id: String(r._id),
        name: u?.name || 'Patient',
        rating: r.rating,
        comment: r.notes || '',
        reply: r.doctorReply || '',
        harassed: r.harassed, bothered: r.bothered, extraCharges: r.extraCharges,
        date: r.createdAt,
      };
    }));

    const count = reviews.length;
    const avg = count ? (reviews.reduce((s, r) => s + r.rating, 0) / count) : 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { if (distribution[r.rating] !== undefined) distribution[r.rating]++; });

    return res.json({ success: true, average: Math.round(avg * 10) / 10, count, distribution, reviews });
  } catch (err) { next(err); }
}

// POST /api/doctor/reviews/:id/reply  body: { reply }
// The doctor replies to a patient's review; the reply is saved and delivered
// to that patient as a notification.
async function replyToReview(req, res, next) {
  try {
    const reply = String(req.body?.reply || '').trim();
    if (!reply) return fail(res, 400, 'Please write a reply.', 'BAD_INPUT');

    const fb = await DoctorFeedback.findById(req.params.id);
    if (!fb) return fail(res, 404, 'Review not found.', 'NOT_FOUND');

    // Only the doctor who received the review may reply.
    const doctorId = req.user.doctorId || '';
    const ownsIt = doctorId ? fb.doctorId === doctorId : fb.doctorName === req.user.name;
    if (!ownsIt) return fail(res, 403, 'You can only reply to your own reviews.', 'FORBIDDEN');

    fb.doctorReply = reply;
    fb.doctorRepliedAt = new Date();
    await fb.save();

    // Notify the patient who left the review.
    notifyUser(fb.user, {
      type: 'system',
      title: `Reply from ${req.user.name || 'your doctor'}`,
      body: reply,
      icon: 'chatbubble-ellipses-outline',
      screen: 'NotificationsScreen',
    });

    return res.json({ success: true, message: 'Reply sent to the patient.' });
  } catch (err) { next(err); }
}

module.exports = { getReviews, replyToReview };
