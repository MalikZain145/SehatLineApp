// Medicine model — pharmacy inventory, seeded and served to the app.

const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    category: { type: String, default: 'General' },   // Antibiotic, Painkiller...
    price: { type: Number, required: true },           // per strip/unit (PKR)
    unit: { type: String, default: 'strip' },
    description: { type: String, default: '' },
    prescriptionRequired: { type: Boolean, default: false },
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medicine', medicineSchema);
