// LabInventory — a laboratory consumable / reagent / equipment item. Status
// (In/Low/Out of Stock) is derived from quantity vs minimumStock so it never
// drifts out of sync. Mirrors the pharmacy Medicine model.

const mongoose = require('mongoose');

const labInventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: 'Sample Collection', trim: true }, // Sample Collection/Biochemistry/Equipment/Reagents…
    quantity: { type: Number, default: 0, min: 0 },   // total base units (cartons × unitsPerCarton)
    unit: { type: String, default: 'pieces', trim: true },   // pieces/boxes/bottles…
    cartons: { type: Number, default: 0, min: 0 },
    unitsPerCarton: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 10, min: 0 },
    expiryDate: { type: String, default: '' },               // 'MMM YYYY' or free text
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

labInventorySchema.methods.statusLabel = function statusLabel() {
  if (this.quantity <= 0) return 'Out of Stock';
  if (this.quantity <= this.minimumStock) return 'Low Stock';
  return 'In Stock';
};

module.exports = mongoose.model('LabInventory', labInventorySchema);
