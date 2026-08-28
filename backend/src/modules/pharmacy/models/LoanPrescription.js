// Loan Prescription (LP) — a digital local-purchase slip the pharmacist
// generates when prescribed medicine is out of stock. The patient buys it
// locally; the LP records exactly what (name, quantity, mg) was owed.

const mongoose = require('mongoose');

const lpSchema = new mongoose.Schema(
  {
    lpNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', index: true },
    tokenNumber: { type: String, default: '' },
    patientName: { type: String, default: '' },
    doctorName: { type: String, default: '' },
    // The out-of-stock items the patient must buy locally.
    items: [
      {
        name: { type: String, default: '' },
        quantity: { type: String, default: '' },  // as the doctor prescribed
        note: { type: String, default: '' },
      },
    ],
    reason: { type: String, default: 'out_of_stock' },
    createdByName: { type: String, default: '' },
    status: { type: String, enum: ['open', 'purchased'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoanPrescription', lpSchema);
