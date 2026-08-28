// LabReport model — a laboratory report for a patient.
//
// In production these are created by the LABORATORY module (future) when a
// patient's tests are done. Each report carries its individual parameters
// with reference ranges, so the app can analyse it, flag out-of-range
// values, and suggest next steps. The report also keeps the issuing lab's
// identity for the printable PDF (Capital Hospital, CDA, G-6/2 Islamabad).

const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },   // e.g. 'Hemoglobin'
    value: { type: String, required: true },  // stored as string ('13.2', 'Negative')
    unit: { type: String, default: '' },      // 'g/dL'
    // Reference range: numeric bounds when applicable, else a text range.
    refLow: { type: Number, default: null },
    refHigh: { type: Number, default: null },
    refText: { type: String, default: '' },    // e.g. 'Negative', '< 200'
    // Status may be provided by the lab; if blank the analyser computes it.
    status: { type: String, enum: ['normal', 'high', 'low', 'abnormal', ''], default: '' },
  },
  { _id: false }
);

const labReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    reportNumber: { type: String, default: '' },   // e.g. 'L-0459'
    title: { type: String, required: true },        // 'Complete Blood Count (CBC)'
    category: { type: String, default: 'Blood Test', index: true },

    // Snapshot of the patient (so the PDF is self-contained).
    patient: {
      name: { type: String, default: '' },
      age: { type: Number, default: 0 },
      gender: { type: String, default: '' },
      cnic: { type: String, default: '' },
      mrn: { type: String, default: '' },          // medical record no. / CDA card
    },

    referredBy: { type: String, default: '' },      // doctor
    labName: { type: String, default: 'Capital Hospital Laboratory' },

    collectedAt: { type: Date, default: Date.now },
    reportedAt: { type: Date, default: Date.now },

    results: { type: [resultSchema], default: [] },
    remarks: { type: String, default: '' },

    // Optional uploaded PDF report (the lab can attach the scanned/printed PDF
    // instead of, or alongside, structured results). Stored as a base64 data
    // string so the patient can open it from their app.
    pdfName: { type: String, default: '' },
    pdfData: { type: String, default: '' },   // base64 (no data: prefix)

    // Optional link back to the token/prescription that ordered these tests.
    token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },

    // Who created this report: 'lab' = issued by the laboratory module (queue
    // complete OR card-number upload); '' = patient-seeded demo. Lab-facing
    // lists/analytics count only source:'lab'.
    source: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

labReportSchema.index({ user: 1, reportedAt: -1 });

module.exports = mongoose.model('LabReport', labReportSchema);
