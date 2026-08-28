// LabTest — an entry in the laboratory's test catalog (what the lab offers).
// Reference data the lab staff manage; the doctor's prescribed test names are
// matched against these for pricing / sample-type / turnaround info.

const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },   // 'Complete Blood Count (CBC)'
    code: { type: String, default: '', trim: true },                   // 'CBC'
    category: { type: String, default: 'Hematology', trim: true },     // Hematology/Biochemistry/…
    sampleType: { type: String, default: 'Blood', trim: true },        // Blood/Urine/Stool/…
    price: { type: Number, default: 0, min: 0 },                       // PKR
    turnaroundHours: { type: Number, default: 24, min: 0 },            // TAT
    description: { type: String, default: '' },
    // Reference parameters this test reports (name + unit + normal range),
    // used to prefill the result entry form when a report is created.
    parameters: {
      type: [{
        name: { type: String, default: '' },
        unit: { type: String, default: '' },
        refLow: { type: Number, default: null },
        refHigh: { type: Number, default: null },
        refText: { type: String, default: '' },
      }],
      default: [],
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LabTest', labTestSchema);
