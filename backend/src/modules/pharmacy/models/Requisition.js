// Requisition — a pharmacist's request to the admin to restock/procure
// medicine(s). The admin reads these in the Admin portal.

const mongoose = require('mongoose');

const requisitionSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromName: { type: String, default: '' },
    items: [
      {
        name: { type: String, default: '' },
        category: { type: String, default: 'Tablet' },   // Tablet/Syrup/Injection/…
        quantity: { type: String, default: '' },          // free-text fallback / cartons
        cartons: { type: Number, default: 0 },
        boxesPerCarton: { type: Number, default: 0 },
        unitsPerBox: { type: Number, default: 0 },         // tablets per box
      },
    ],
    note: { type: String, default: '' },
    status: { type: String, enum: ['open', 'fulfilled'], default: 'open', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Requisition', requisitionSchema);
