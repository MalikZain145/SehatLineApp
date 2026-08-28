// OCR robustness helpers for CNIC detection.
//
// Tesseract on a phone photo is noisy: it confuses 1/l/I, 0/O, 5/S, 8/B, and
// drops or doubles characters. Exact substring matching against a keyword
// list therefore fails on perfectly valid CNICs.
//
// These helpers make matching tolerant:
//   1. normalizeDigits  — map letter-shaped characters back to digits
//   2. normalizeText    — collapse whitespace/punctuation for comparison
//   3. fuzzyIncludes    — keyword match allowing a small edit distance
//   4. findCnicNumber   — pull a 13-digit sequence out of noisy text

// Characters OCR commonly returns instead of digits.
const DIGIT_CONFUSABLES = {
  o: '0', O: '0', Q: '0', D: '0',
  i: '1', I: '1', l: '1', L: '1', '|': '1', '!': '1',
  z: '2', Z: '2',
  e: '3',
  a: '4', A: '4',
  s: '5', S: '5',
  b: '6', G: '6',
  t: '7', T: '7', '?': '7',
  B: '8',
  g: '9', q: '9',
};

// Replace letter-shaped characters with the digits they most likely are.
// Only used when we're specifically hunting for a numeric sequence.
function normalizeDigits(str) {
  return String(str || '')
    .split('')
    .map((ch) => (DIGIT_CONFUSABLES[ch] !== undefined ? DIGIT_CONFUSABLES[ch] : ch))
    .join('');
}

// Lowercase, strip accents/punctuation, collapse whitespace.
function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance, capped for speed (we only care about small edits).
function editDistance(a, b, max = 3) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;   // early exit
    prev = cur;
  }
  return prev[b.length];
}

// Allowed edits scale with keyword length: short words must match tightly,
// but we allow at least 1 edit from 5 characters up — OCR reliably mangles
// one character in words like "birth" → "bir1h".
function allowedEdits(word) {
  if (word.length <= 3) return 0;
  if (word.length <= 5) return 1;
  if (word.length <= 8) return 2;
  if (word.length <= 12) return 3;
  return 4;
}

// Does `haystack` contain `needle`, tolerating OCR noise?
// Multi-word needles are checked phrase-wise over a sliding window.
function fuzzyIncludes(haystack, needle) {
  const hay = normalizeText(haystack);
  const need = normalizeText(needle);
  if (!hay || !need) return false;
  if (hay.includes(need)) return true;          // fast path

  const needWords = need.split(' ');
  const hayWords = hay.split(' ');
  const n = needWords.length;
  if (hayWords.length < n) return false;

  const budget = needWords.reduce((sum, w) => sum + allowedEdits(w), 0);

  for (let i = 0; i + n <= hayWords.length; i++) {
    let total = 0;
    let ok = true;
    for (let j = 0; j < n; j++) {
      const d = editDistance(hayWords[i + j], needWords[j], allowedEdits(needWords[j]));
      if (d > allowedEdits(needWords[j])) { ok = false; break; }
      total += d;
    }
    if (ok && total <= budget) return true;
  }
  return false;
}

// Find a 13-digit CNIC number in noisy text.
// Strategy: normalize letter→digit confusables, then look for any run of 13
// digits (dashes/spaces optional). Returns '' when nothing plausible is found.
function findCnicNumber(rawText) {
  const text = String(rawText || '');

  // Pass 1: strict — the number as printed, dashes optional.
  const strict = text.match(/\b(\d{5})[-\s]?(\d{7})[-\s]?(\d)\b/);
  if (strict) return strict.slice(1).join('');

  // Pass 2: tolerant — fix confusables, then scan token by token.
  // We only convert tokens that already look mostly numeric, so we don't turn
  // real words ("Pakistan") into digit soup.
  const tokens = text.split(/[\s]+/);
  for (let i = 0; i < tokens.length; i++) {
    // Join up to 3 adjacent tokens: "61101 8524979 7"
    for (let span = 1; span <= 3 && i + span <= tokens.length; span++) {
      const chunk = tokens.slice(i, i + span).join('');
      const digitish = chunk.replace(/[-]/g, '');
      if (digitish.length < 13 || digitish.length > 16) continue;

      // Require the chunk to be mostly numeric already (guards against words).
      const numericRatio = (digitish.match(/\d/g) || []).length / digitish.length;
      if (numericRatio < 0.6) continue;

      const digits = normalizeDigits(digitish).replace(/\D/g, '');
      if (digits.length === 13) return digits;
    }
  }
  return '';
}

// Pull EVERY plausible 13-digit CNIC number the card shows, as a set of
// candidate strings. Used for STRICT verification: the number the user typed
// must be one of these exactly. Returns [] when no 13-digit number can be
// read at all (so the caller can reject / ask for a clearer photo instead of
// silently passing).
function findCnicCandidates(rawText) {
  const text = String(rawText || '');
  const out = new Set();

  // Strategy A — the printed 5-7-1 layout, dashes/spaces optional, tolerating
  // letter-for-digit OCR confusions (the most reliable signal).
  const fmt = /([\dloiszbgqIOSZBGQ]{5})[-\s]*([\dloiszbgqIOSZBGQ]{7})[-\s]*([\dloiszbgqIOSZBGQ]{1})/g;
  let m;
  while ((m = fmt.exec(text)) !== null) {
    const digits = normalizeDigits(m[1] + m[2] + m[3]).replace(/\D/g, '');
    if (digits.length === 13) out.add(digits);
  }

  // Strategy B — a run of exactly 13 numeric-ish characters (tokens joined),
  // for cards where OCR dropped the dashes.
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    for (let span = 1; span <= 4 && i + span <= tokens.length; span++) {
      const chunk = tokens.slice(i, i + span).join('').replace(/-/g, '');
      if (chunk.length !== 13) continue;
      const numericRatio = (chunk.match(/[\dloiszbgqIOSZBGQ]/g) || []).length / chunk.length;
      if (numericRatio < 0.85) continue; // must be almost entirely digit-ish
      const digits = normalizeDigits(chunk).replace(/\D/g, '');
      if (digits.length === 13) out.add(digits);
    }
  }

  return [...out];
}

// Count date-like patterns (CNICs always carry DOB / issue / expiry).
// Recognizes both numeric (31.12.2002) and month-name (31 Dec 2002) forms.
// Note: we do NOT run normalizeDigits over the whole text — that would turn
// ordinary words into digit soup and inflate the count.
const MONTH_RE = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';

function countDates(rawText) {
  const text = String(rawText || '');

  // Numeric, tolerating the letters OCR substitutes for digits.
  const numeric = text.match(
    /\b[\dloiszbgqIOSZBGQ]{1,2}\s*[.\-/,\s]\s*[\dloiszbgqIOSZBGQ]{1,2}\s*[.\-/,\s]\s*[\dloiszbgqIOSZBGQ]{4}\b/g
  ) || [];

  // Month-name, either order.
  const named = text.match(
    new RegExp(`\\b(\\d{1,2}\\s*[.\\-/,\\s]\\s*(${MONTH_RE})[a-z]*|(${MONTH_RE})[a-z]*\\s*[.\\-/,\\s]\\s*\\d{1,2})\\s*[.\\-/,\\s]\\s*\\d{4}\\b`, 'gi')
  ) || [];

  return numeric.length + named.length;
}

module.exports = {
  normalizeDigits,
  normalizeText,
  editDistance,
  fuzzyIncludes,
  findCnicNumber,
  findCnicCandidates,
  countDates,
};
