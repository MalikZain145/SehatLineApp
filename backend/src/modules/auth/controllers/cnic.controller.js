// CNIC verification controller.
// The app captures the CNIC (front/back) with the in-app camera and POSTs
// the image here. We:
//   1) confirm the image is actually a CNIC (OCR detection)
//   2) for the FRONT image, if the user's typed data (cnic/name/dob) is sent,
//      we EXTRACT the same fields from the image and MATCH them. On mismatch
//      we return code MISMATCH so the app can send the user back to the form
//      with a precise error.

const path = require('path');
const fs = require('fs');
const { detectCnic, matchCnicData } = require('../../../services/cnic.service');
const User = require('../models/User');
const logger = require('../../../utils/logger');

// POST /api/auth/cnic/verify  (multipart: field "image", "side", and optional
// user fields: cnic, name, dob — sent for the front image to enable matching)
async function verifyCnic(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'NO_IMAGE', message: 'No image received' });
    }

    const side = (req.body.side || 'front').toLowerCase();
    logger.info(`CNIC verify requested (${side}) from ${req.clientIp}`);

    const verdict = await detectCnic(req.file.path, side);

    // If it doesn't look like a CNIC, delete the saved file (don't keep junk).
    if (!verdict.isCnic) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      logger.warn(`CNIC rejected (${side}) confidence=${verdict.confidence} signals=${JSON.stringify(verdict.signals)}`);

      // Tailor the hint to what the OCR actually saw, so the user knows what
      // to fix rather than just retrying blindly.
      const s = verdict.signals || {};
      let message;
      if (!s.wordCount || s.wordCount < 4) {
        message = 'We could not read any text on the card. Move closer, hold steady, and make sure the card fills the frame.';
      } else if (side === 'front' && !s.hasCnicNumber) {
        message = 'We could not read the 13-digit CNIC number. Make sure the number is inside the frame, sharp, and free of glare.';
      } else {
        message = 'This does not look like a valid CNIC. Capture the correct side of the card in good lighting.';
      }

      return res.status(422).json({
        success: false,
        code: 'NOT_A_CNIC',
        message,
        verdict: {
          isCnic: verdict.isCnic,
          confidence: verdict.confidence,
          textPreview: verdict.textPreview,
        },
      });
    }

    // ---- Data matching (front image only, when user data is provided) ----
    if (side === 'front' && (req.body.cnic || req.body.name || req.body.dob)) {
      const match = matchCnicData(verdict.rawText, {
        cnic: req.body.cnic || '',
        name: req.body.name || '',
        dob: req.body.dob || '',
      });

      logger.info(
        `CNIC match -> cnic:${match.fields.cnic} name:${match.fields.name} dob:${match.fields.dob} ` +
        `(read cnic=${match.extracted.cnic || 'none'})`
      );

      if (!match.match) {
        // Remove the stored image — it didn't match the entered data.
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        logger.warn(`CNIC data MISMATCH: ${match.message}`);
        return res.status(422).json({
          success: false,
          code: 'MISMATCH',
          message: match.message,
          fields: match.fields,
        });
      }

      // ---- Duplicate guard ----
      // The card in front of the camera is real and matches what was typed.
      // Before we let signup continue, make sure this person (or this CDA
      // card) doesn't already hold an account. Catching it here saves the
      // user from filling in the rest of the form for nothing.
      const dupChecks = [];
      const typedCnic = String(req.body.cnic || '').trim();
      const readCnic = match.extracted.cnic || '';
      if (typedCnic) dupChecks.push({ cnic: typedCnic });
      // Also check the digits-only form we read off the card.
      if (readCnic) {
        const dashed = `${readCnic.slice(0, 5)}-${readCnic.slice(5, 12)}-${readCnic.slice(12)}`;
        dupChecks.push({ cnic: readCnic }, { cnic: dashed });
      }
      const typedCard = String(req.body.cdaCard || '').trim();
      const normCard = typedCard
        ? (typedCard.endsWith('-RB') ? typedCard : `${typedCard}-RB`)
        : '';
      if (normCard) dupChecks.push({ cdaCard: normCard });

      if (dupChecks.length) {
        const existing = await User.findOne({ $or: dupChecks });
        if (existing) {
          try { fs.unlinkSync(req.file.path); } catch (_) {}
          const isCard = normCard && existing.cdaCard === normCard;
          logger.warn(`CNIC verify blocked — ${isCard ? 'CDA card' : 'CNIC'} already registered (${existing.email})`);
          return res.status(409).json({
            success: false,
            code: 'ALREADY_REGISTERED',
            field: isCard ? 'cdaCard' : 'cnic',
            message: isCard
              ? 'This CDA card number is already registered to an account. Please log in instead.'
              : 'This CNIC is already registered to an account. Please log in instead.',
          });
        }
      }
    }

    logger.success(`CNIC accepted (${side}) confidence=${verdict.confidence}`);
    return res.json({
      success: true,
      message: 'CNIC verified successfully',
      side,
      imagePath: `/uploads/${path.basename(req.file.path)}`,
      verdict: { isCnic: verdict.isCnic, confidence: verdict.confidence },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { verifyCnic };
