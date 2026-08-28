// LabRequisition — a lab tech's request to the admin to restock/procure lab
// consumables or reagents. Mirrors the pharmacy Requisition; the admin reads
// these in the Admin portal (staff reports/requisitions).

const mongoose = require('mongoose');

const labRequisitionSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromName: { type: String, default: '' },
    items: [
      {
        name: { type: String, default: '' },
        category: { type: String, default: 'Sample Collection' }, // Kits/Syringes/Tubes/Urine Bottles/Stool Bottles/Reagents/…
        quantity: { type: String, default: '' },
      },
    ],
    note: { type: String, default: '' },
    status: { type: String, enum: ['open', 'fulfilled'], default: 'open', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LabRequisition', labRequisitionSchema);
