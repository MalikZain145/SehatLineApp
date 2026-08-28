// Match a doctor's free-text prescription lines against the pharmacy inventory
// to decide what is available and what is out of stock (drives the LP button).

const Medicine = require('../models/Medicine');

function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// "Amlodipine 5mg — 7 Days (Take with food)" → drug name "Amlodipine",
// and a best-effort quantity/duration string.
function parseLine(line) {
  const str = String(line || '').trim();
  const beforeDash = str.split('—')[0].split(/\s+x\s+/i)[0].trim();
  const drug = beforeDash.split(/\s+/)[0] || beforeDash; // first word = drug name
  const qtyMatch = str.match(/—\s*(.+?)(?:\s*\(|$)/);
  return { name: beforeDash, drug, quantity: qtyMatch ? qtyMatch[1].trim() : '' };
}

async function checkAvailability(medicineStrings) {
  const lines = Array.isArray(medicineStrings) ? medicineStrings.filter(Boolean) : [];
  const items = [];
  for (const line of lines) {
    const { name, drug, quantity } = parseLine(line);
    const inv = drug ? await Medicine.findOne({ name: new RegExp(escapeRegex(drug), 'i') }) : null;
    const available = !!(inv && inv.stock > 0);
    items.push({ line, name, drug, quantity, available, inStock: inv ? inv.stock : 0, medicineId: inv ? String(inv._id) : null });
  }
  return { items, hasOutOfStock: items.some((i) => !i.available) };
}

module.exports = { checkAvailability, parseLine };
