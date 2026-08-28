// Seeds the laboratory test catalog and a starter consumables inventory.
// Idempotent: upserts by name so re-running never duplicates.

const LabTest = require('../src/modules/laboratory/models/LabTest');
const LabInventory = require('../src/modules/laboratory/models/LabInventory');

const TESTS = [
  { name: 'Complete Blood Count (CBC)', code: 'CBC', category: 'Hematology', sampleType: 'Blood', price: 600, turnaroundHours: 6,
    parameters: [
      { name: 'Hemoglobin', unit: 'g/dL', refLow: 13.5, refHigh: 17.5 },
      { name: 'WBC Count', unit: 'x10³/µL', refLow: 4.0, refHigh: 11.0 },
      { name: 'Platelets', unit: 'x10³/µL', refLow: 150, refHigh: 400 },
      { name: 'Hematocrit', unit: '%', refLow: 40, refHigh: 50 },
    ] },
  { name: 'Lipid Profile', code: 'LIPID', category: 'Biochemistry', sampleType: 'Blood', price: 1200, turnaroundHours: 12,
    parameters: [
      { name: 'Total Cholesterol', unit: 'mg/dL', refHigh: 200 },
      { name: 'LDL Cholesterol', unit: 'mg/dL', refHigh: 130 },
      { name: 'HDL Cholesterol', unit: 'mg/dL', refLow: 40 },
      { name: 'Triglycerides', unit: 'mg/dL', refHigh: 150 },
    ] },
  { name: 'Blood Sugar (Fasting)', code: 'FBS', category: 'Biochemistry', sampleType: 'Blood', price: 300, turnaroundHours: 4,
    parameters: [{ name: 'Fasting Glucose', unit: 'mg/dL', refLow: 70, refHigh: 99 }] },
  { name: 'HbA1c', code: 'HBA1C', category: 'Biochemistry', sampleType: 'Blood', price: 1500, turnaroundHours: 12,
    parameters: [{ name: 'HbA1c', unit: '%', refHigh: 5.7 }] },
  { name: 'Liver Function Test (LFT)', code: 'LFT', category: 'Biochemistry', sampleType: 'Blood', price: 1400, turnaroundHours: 12,
    parameters: [
      { name: 'ALT (SGPT)', unit: 'U/L', refLow: 7, refHigh: 56 },
      { name: 'AST (SGOT)', unit: 'U/L', refLow: 10, refHigh: 40 },
      { name: 'Bilirubin (Total)', unit: 'mg/dL', refLow: 0.1, refHigh: 1.2 },
    ] },
  { name: 'Kidney Function Test (RFT)', code: 'RFT', category: 'Biochemistry', sampleType: 'Blood', price: 1400, turnaroundHours: 12,
    parameters: [
      { name: 'Urea', unit: 'mg/dL', refLow: 7, refHigh: 20 },
      { name: 'Creatinine', unit: 'mg/dL', refLow: 0.6, refHigh: 1.3 },
    ] },
  { name: 'Thyroid Profile (TSH)', code: 'TSH', category: 'Endocrinology', sampleType: 'Blood', price: 900, turnaroundHours: 24,
    parameters: [{ name: 'TSH', unit: 'mIU/L', refLow: 0.4, refHigh: 4.0 }] },
  { name: 'Urine Routine Examination', code: 'URE', category: 'Clinical Pathology', sampleType: 'Urine', price: 400, turnaroundHours: 4, parameters: [] },
  { name: 'Electrolytes (Na/K/Cl)', code: 'ELEC', category: 'Biochemistry', sampleType: 'Blood', price: 800, turnaroundHours: 6,
    parameters: [
      { name: 'Sodium', unit: 'mmol/L', refLow: 135, refHigh: 145 },
      { name: 'Potassium', unit: 'mmol/L', refLow: 3.5, refHigh: 5.1 },
    ] },
  { name: 'C-Reactive Protein (CRP)', code: 'CRP', category: 'Immunology', sampleType: 'Blood', price: 900, turnaroundHours: 12,
    parameters: [{ name: 'CRP', unit: 'mg/L', refHigh: 5 }] },
];

const INVENTORY = [
  { name: 'Blood Collection Tubes (EDTA)', category: 'Sample Collection', quantity: 120, unit: 'pieces', minimumStock: 50, expiryDate: 'Dec 2027' },
  { name: 'Blood Collection Tubes (Serum)', category: 'Sample Collection', quantity: 90, unit: 'pieces', minimumStock: 50, expiryDate: 'Nov 2027' },
  { name: 'Glucose Test Strips', category: 'Biochemistry', quantity: 45, unit: 'boxes', minimumStock: 50, expiryDate: 'Aug 2027' },
  { name: 'Urine Containers', category: 'Sample Collection', quantity: 85, unit: 'pieces', minimumStock: 40, expiryDate: 'Jan 2028' },
  { name: 'Syringes (5ml)', category: 'Equipment', quantity: 15, unit: 'boxes', minimumStock: 30, expiryDate: 'Oct 2028' },
  { name: 'Lancets', category: 'Sample Collection', quantity: 200, unit: 'pieces', minimumStock: 80, expiryDate: 'Mar 2028' },
  { name: 'CBC Reagent Kit', category: 'Reagents', quantity: 8, unit: 'kits', minimumStock: 5, expiryDate: 'Jun 2026' },
  { name: 'Lipid Reagent Kit', category: 'Reagents', quantity: 4, unit: 'kits', minimumStock: 5, expiryDate: 'May 2026' },
  { name: 'Gloves (Nitrile, M)', category: 'Equipment', quantity: 60, unit: 'boxes', minimumStock: 40, expiryDate: 'Feb 2029' },
  { name: 'Alcohol Swabs', category: 'Sample Collection', quantity: 300, unit: 'pieces', minimumStock: 100, expiryDate: 'Dec 2027' },
];

async function seedLaboratory() {
  let tCreated = 0;
  for (const t of TESTS) {
    // eslint-disable-next-line no-await-in-loop
    const r = await LabTest.updateOne({ name: t.name }, { $set: t }, { upsert: true });
    if (r.upsertedCount) tCreated += 1;
  }
  let iCreated = 0;
  for (const it of INVENTORY) {
    // eslint-disable-next-line no-await-in-loop
    const r = await LabInventory.updateOne({ name: it.name }, { $setOnInsert: it }, { upsert: true });
    if (r.upsertedCount) iCreated += 1;
  }
  return { tests: TESTS.length, testsCreated: tCreated, inventory: INVENTORY.length, inventoryCreated: iCreated };
}

module.exports = { seedLaboratory };
