// Medicine — a pharmacy inventory item. Status (In/Low/Out of Stock) is
// derived from stock vs minimumStock, so it never drifts out of sync.

const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, default: '', trim: true },
    category: { type: String, default: 'Tablet', trim: true },   // dosage form: Tablet/Syrup/Injection…
    department: { type: String, default: 'General', trim: true }, // medical department: Cardiology/Diabetes/… (drives the analytics pie)
    strength: { type: String, default: '', trim: true },   // e.g. '500mg', '250mg/5ml' (syrup power)
    // Stock is tracked in BASE UNITS (tablets for tablets/capsules, bottles for
    // syrups, vials for injections). Packaging just describes how it's ordered
    // and lets a requisition of N cartons convert to base units.
    stock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 10, min: 0 },
    unitsPerBox: { type: Number, default: 1, min: 1 },     // tablets per box (or 1 for syrups/injections)
    boxesPerCarton: { type: Number, default: 1, min: 1 },  // boxes per carton
    expiry: { type: String, default: '' },        // 'MM/YYYY' or free text
    batchNumber: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

// Derived stock status used by the app for badges + filters.
medicineSchema.methods.statusLabel = function statusLabel() {
  if (this.stock <= 0) return 'Out of Stock';
  if (this.stock <= this.minimumStock) return 'Low Stock';
  return 'In Stock';
};

// Named 'InventoryMedicine' to avoid clashing with the patient module's
// personal 'Medicine' (med-bank) model.
module.exports = mongoose.models.InventoryMedicine || mongoose.model('InventoryMedicine', medicineSchema);
