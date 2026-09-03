// Multer config for CNIC image uploads.
// Saves to /uploads with a unique name, limits size, and only allows images.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// On serverless hosts (e.g. Vercel) the project filesystem is read-only — only
// /tmp is writable — so writing to a project ./uploads folder would crash the
// function at boot. Use /tmp there, and guard the mkdir either way.
const UPLOAD_DIR = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '..', '..', 'uploads');
try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) { /* read-only fs — CNIC OCR still writes to /tmp per request */ }

// Map the (validated) MIME type to a safe extension. We NEVER trust the
// extension from the client-supplied originalname — otherwise an attacker could
// have us write `shell.php`/`x.svg`/`x.html` into the publicly-served /uploads
// dir (stored-XSS / traversal risk). Only these two extensions can ever be
// written, and the base name is sanitized to alphanumerics.
const MIME_EXT = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || '.jpg';
    const base = String(file.fieldname || 'file').replace(/[^a-z0-9]/gi, '').slice(0, 20) || 'file';
    cb(null, `${base}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  // MIME is client-controlled, so this is a first gate only; the extension is
  // still forced from MIME_EXT above regardless of what is claimed.
  if (Object.prototype.hasOwnProperty.call(MIME_EXT, file.mimetype)) return cb(null, true);
  cb(new Error('Only JPG/PNG images are allowed'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB per image
});

// In-memory uploader for spreadsheets (parsed, never stored). Used by the admin
// bulk doctor/staff import.
const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (/spreadsheet|excel|\.xlsx?$/i.test(`${file.mimetype} ${file.originalname}`)) return cb(null, true);
    cb(new Error('Only Excel (.xlsx) files are allowed'));
  },
});

module.exports = { upload, uploadSheet, UPLOAD_DIR };
