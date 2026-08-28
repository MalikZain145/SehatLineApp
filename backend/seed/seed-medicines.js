// Seed the pharmacy inventory (300+ medicines) covering the chronic OPD
// specialities — Cardiology (Heart), Diabetes and Psychiatry — plus common
// hospital medicines. Each name carries its mg; stock/min/expiry/batch are set,
// with a few Out-of-Stock / Low so the LP flow + badges are demoable.
// Run:  node seed/seed-medicines.js   (or required by the main seed)

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Medicine = require('../src/modules/pharmacy/models/Medicine');

// ── Medicines grouped by category ────────────────────────────────────────────
const GROUPS = {
  Cardiology: [
    'Amiodarone 100mg', 'Amiodarone 200mg', 'Amlodipine 5mg', 'Amlodipine 10mg',
    'Apixaban 2.5mg', 'Apixaban 5mg', 'Aspirin 75mg', 'Aspirin 150mg',
    'Atenolol 25mg', 'Atenolol 50mg', 'Atenolol 100mg', 'Atorvastatin 10mg',
    'Atorvastatin 20mg', 'Atorvastatin 40mg', 'Atorvastatin 80mg',
    'Bisoprolol 2.5mg', 'Bisoprolol 5mg', 'Captopril 25mg', 'Captopril 50mg',
    'Carvedilol 3.125mg', 'Carvedilol 6.25mg', 'Carvedilol 12.5mg', 'Carvedilol 25mg',
    'Clopidogrel 75mg', 'Digoxin 0.125mg', 'Digoxin 0.25mg', 'Diltiazem 30mg',
    'Diltiazem 60mg', 'Enalapril 5mg', 'Enalapril 10mg', 'Empagliflozin 10mg',
    'Empagliflozin 25mg', 'Furosemide 20mg', 'Furosemide 40mg',
    'Hydrochlorothiazide 12.5mg', 'Hydrochlorothiazide 25mg',
    'Isosorbide Mononitrate 10mg', 'Isosorbide Mononitrate 20mg',
    'Ivabradine 5mg', 'Ivabradine 7.5mg', 'Lisinopril 5mg', 'Lisinopril 10mg',
    'Losartan 25mg', 'Losartan 50mg', 'Losartan 100mg', 'Metoprolol 25mg',
    'Metoprolol 50mg', 'Metoprolol 100mg', 'Nitroglycerin 0.4mg (SL)',
    'Ramipril 2.5mg', 'Ramipril 5mg', 'Ramipril 10mg', 'Rivaroxaban 15mg',
    'Rivaroxaban 20mg', 'Rosuvastatin 10mg', 'Rosuvastatin 20mg',
    'Sacubitril/Valsartan 49/51mg', 'Sacubitril/Valsartan 97/103mg',
    'Spironolactone 25mg', 'Spironolactone 50mg', 'Telmisartan 40mg',
    'Telmisartan 80mg', 'Ticagrelor 90mg', 'Valsartan 80mg', 'Valsartan 160mg',
    'Warfarin 2mg', 'Warfarin 5mg',
  ],
  Diabetes: [
    'Metformin 500mg', 'Metformin 850mg', 'Metformin 1000mg', 'Metformin XR 500mg',
    'Glimepiride 1mg', 'Glimepiride 2mg', 'Glimepiride 4mg',
    'Gliclazide 40mg', 'Gliclazide 80mg', 'Gliclazide MR 30mg', 'Gliclazide MR 60mg',
    'Glibenclamide 5mg', 'Glipizide 5mg',
    'Sitagliptin 25mg', 'Sitagliptin 50mg', 'Sitagliptin 100mg',
    'Vildagliptin 50mg', 'Linagliptin 5mg', 'Saxagliptin 5mg',
    'Dapagliflozin 5mg', 'Dapagliflozin 10mg', 'Canagliflozin 100mg', 'Canagliflozin 300mg',
    'Pioglitazone 15mg', 'Pioglitazone 30mg', 'Repaglinide 0.5mg', 'Repaglinide 1mg', 'Repaglinide 2mg',
    'Acarbose 50mg', 'Acarbose 100mg',
    'Metformin/Glimepiride 500/1mg', 'Metformin/Glimepiride 500/2mg',
    'Metformin/Sitagliptin 500/50mg', 'Metformin/Vildagliptin 500/50mg',
    'Insulin Glargine 100IU/mL', 'Insulin Aspart 100IU/mL', 'Insulin Lispro 100IU/mL',
    'Insulin Regular 100IU/mL', 'Insulin NPH 100IU/mL', 'Insulin Mixtard 30/70',
    'Insulin Degludec 100IU/mL', 'Liraglutide 6mg/mL', 'Dulaglutide 1.5mg',
    'Empagliflozin/Metformin 12.5/500mg', 'Semaglutide 0.5mg',
  ],
  Psychiatry: [
    'Sertraline 25mg', 'Sertraline 50mg', 'Sertraline 100mg',
    'Fluoxetine 10mg', 'Fluoxetine 20mg', 'Escitalopram 5mg', 'Escitalopram 10mg', 'Escitalopram 20mg',
    'Citalopram 20mg', 'Paroxetine 20mg', 'Fluvoxamine 50mg', 'Fluvoxamine 100mg',
    'Venlafaxine 37.5mg', 'Venlafaxine 75mg', 'Duloxetine 30mg', 'Duloxetine 60mg',
    'Mirtazapine 15mg', 'Mirtazapine 30mg', 'Bupropion XL 150mg',
    'Amitriptyline 10mg', 'Amitriptyline 25mg', 'Nortriptyline 25mg', 'Imipramine 25mg',
    'Olanzapine 5mg', 'Olanzapine 10mg', 'Risperidone 1mg', 'Risperidone 2mg', 'Risperidone 4mg',
    'Quetiapine 25mg', 'Quetiapine 100mg', 'Quetiapine 200mg',
    'Aripiprazole 5mg', 'Aripiprazole 10mg', 'Aripiprazole 15mg',
    'Haloperidol 5mg', 'Clozapine 25mg', 'Clozapine 100mg',
    'Lithium Carbonate 300mg', 'Sodium Valproate 200mg', 'Sodium Valproate 500mg',
    'Lamotrigine 25mg', 'Lamotrigine 50mg', 'Lamotrigine 100mg', 'Carbamazepine 200mg',
    'Diazepam 5mg', 'Lorazepam 1mg', 'Lorazepam 2mg', 'Alprazolam 0.25mg', 'Alprazolam 0.5mg',
    'Clonazepam 0.5mg', 'Clonazepam 2mg', 'Zolpidem 5mg', 'Zolpidem 10mg', 'Buspirone 10mg',
  ],
  Antibiotic: [
    'Amoxicillin 250mg', 'Amoxicillin 500mg', 'Co-Amoxiclav 375mg', 'Co-Amoxiclav 625mg', 'Co-Amoxiclav 1g',
    'Azithromycin 250mg', 'Azithromycin 500mg', 'Ciprofloxacin 250mg', 'Ciprofloxacin 500mg',
    'Levofloxacin 500mg', 'Moxifloxacin 400mg', 'Cefixime 200mg', 'Cefixime 400mg',
    'Cephalexin 500mg', 'Cefuroxime 250mg', 'Cefuroxime 500mg', 'Ceftriaxone 1g (Inj)',
    'Doxycycline 100mg', 'Metronidazole 400mg', 'Clarithromycin 250mg', 'Clarithromycin 500mg',
    'Clindamycin 300mg', 'Nitrofurantoin 100mg', 'Linezolid 600mg', 'Vancomycin 500mg (Inj)',
    'Meropenem 1g (Inj)', 'Piperacillin/Tazobactam 4.5g (Inj)', 'Gentamicin 80mg (Inj)',
    'Erythromycin 250mg', 'Fluconazole 150mg', 'Itraconazole 100mg', 'Acyclovir 400mg',
    'Cotrimoxazole 480mg', 'Ampicillin 500mg', 'Cloxacillin 500mg',
  ],
  Painkiller: [
    'Paracetamol 500mg', 'Paracetamol 1g', 'Ibuprofen 200mg', 'Ibuprofen 400mg',
    'Diclofenac 50mg', 'Diclofenac SR 75mg', 'Naproxen 250mg', 'Naproxen 500mg',
    'Ketorolac 10mg', 'Mefenamic Acid 250mg', 'Mefenamic Acid 500mg', 'Tramadol 50mg',
    'Etoricoxib 60mg', 'Etoricoxib 90mg', 'Etoricoxib 120mg', 'Celecoxib 100mg', 'Celecoxib 200mg',
    'Aceclofenac 100mg', 'Nimesulide 100mg', 'Paracetamol/Codeine 500/8mg',
  ],
  Gastro: [
    'Omeprazole 20mg', 'Omeprazole 40mg', 'Esomeprazole 20mg', 'Esomeprazole 40mg',
    'Pantoprazole 20mg', 'Pantoprazole 40mg', 'Rabeprazole 20mg', 'Lansoprazole 30mg',
    'Ranitidine 150mg', 'Famotidine 20mg', 'Domperidone 10mg', 'Metoclopramide 10mg',
    'Ondansetron 4mg', 'Ondansetron 8mg', 'Loperamide 2mg', 'Hyoscine Butylbromide 10mg',
    'Mebeverine 135mg', 'Sucralfate 1g', 'Lactulose 10g/15mL', 'Bisacodyl 5mg',
    'Mesalazine 400mg', 'Ursodeoxycholic Acid 250mg',
  ],
  Respiratory: [
    'Salbutamol 2mg', 'Salbutamol Inhaler 100mcg', 'Montelukast 4mg', 'Montelukast 5mg', 'Montelukast 10mg',
    'Cetirizine 10mg', 'Loratadine 10mg', 'Fexofenadine 120mg', 'Fexofenadine 180mg', 'Levocetirizine 5mg',
    'Budesonide Inhaler 200mcg', 'Fluticasone/Salmeterol 250/25', 'Theophylline 100mg', 'Theophylline 200mg',
    'Ambroxol 30mg', 'Bromhexine 8mg', 'Dextromethorphan 15mg', 'Ipratropium Inhaler 20mcg',
    'Tiotropium 18mcg', 'Chlorpheniramine 4mg', 'Pseudoephedrine 60mg', 'Guaifenesin 100mg/5mL',
  ],
  Vitamin: [
    'Vitamin D3 200,000IU', 'Vitamin D3 50,000IU', 'Vitamin B12 1000mcg', 'Folic Acid 5mg',
    'Calcium + Vitamin D3', 'Ferrous Sulfate 200mg', 'Ferrous Fumarate 210mg', 'Multivitamin',
    'Vitamin C 500mg', 'Zinc Sulfate 20mg', 'Omega-3 1000mg', 'Vitamin B-Complex',
    'Magnesium 250mg', 'Vitamin E 400IU', 'Iron/Folic Acid', 'Vitamin A 50,000IU',
    'Biotin 5mg', 'Vitamin K 10mg',
  ],
  Endocrine: [
    'Levothyroxine 25mcg', 'Levothyroxine 50mcg', 'Levothyroxine 100mcg', 'Carbimazole 5mg',
    'Prednisolone 5mg', 'Prednisolone 10mg', 'Dexamethasone 0.5mg', 'Hydrocortisone 10mg',
    'Allopurinol 100mg', 'Allopurinol 300mg', 'Febuxostat 40mg', 'Colchicine 0.5mg',
  ],
  General: [
    'Ondansetron ODT 4mg', 'Paracetamol Syrup 120mg/5mL', 'ORS Sachet',
    'Cetirizine Syrup 5mg/5mL', 'Diazepam 2mg', 'Amlodipine/Valsartan 5/80mg',
    'Losartan/HCTZ 50/12.5mg', 'Metformin XR 1000mg', 'Atorvastatin 5mg',
    'Pregabalin 75mg', 'Gabapentin 300mg', 'Baclofen 10mg', 'Tizanidine 2mg',
    'Betahistine 16mg', 'Domperidone/PPI 10/20mg',
  ],
};

// A handful deliberately Out-of-Stock (LP demo) and Low (badge demo).
const OUT_OF_STOCK = new Set([
  'Sacubitril/Valsartan 49/51mg', 'Sacubitril/Valsartan 97/103mg', 'Ivabradine 7.5mg',
  'Semaglutide 0.5mg', 'Clozapine 100mg', 'Meropenem 1g (Inj)',
]);
const LOW_STOCK = new Set([
  'Digoxin 0.25mg', 'Warfarin 5mg', 'Insulin Degludec 100IU/mL', 'Lithium Carbonate 300mg',
  'Etoricoxib 120mg', 'Vancomycin 500mg (Inj)',
]);

function categoryOf(group, name) {
  if (/inhaler|inj\)/i.test(name)) return /Inj\)/i.test(name) ? 'Injection' : 'Inhaler';
  if (/insulin/i.test(name)) return 'Injection';
  return group; // group name doubles as the display category
}
function manufacturerFor(i) {
  const list = ['GSK Pakistan', 'Getz Pharma', 'Highnoon', 'Sami Pharma', 'Searle', 'Abbott', 'Novartis', 'Pfizer'];
  return list[i % list.length];
}

async function seedMedicines() {
  const rows = [];
  let i = 0;
  for (const [group, names] of Object.entries(GROUPS)) {
    for (const name of names) {
      const minimumStock = 30;
      let stock;
      if (OUT_OF_STOCK.has(name)) stock = 0;
      else if (LOW_STOCK.has(name)) stock = 8 + (i % 18);           // <= min
      else stock = 60 + ((i * 13) % 260);                          // healthy
      const year = 2027 + (i % 3);
      // Pull the dose out of the name, e.g. 'Metformin 500mg' -> '500mg'.
      const strengthMatch = name.match(/\d[\d.]*\s?(mg|mcg|g|iu|%|ml|units?)\b[^()]*/i);
      rows.push({
        name,
        genericName: name.replace(/\s+\d.*$/, '').replace(/\s*\(.*\)$/, '').trim(),
        strength: strengthMatch ? strengthMatch[0].trim() : '',
        category: categoryOf(group, name),
        department: group,   // medical department (Cardiology, Diabetes, Psychiatry, …)
        stock,
        minimumStock,
        expiry: `${String((i % 12) + 1).padStart(2, '0')}/${year}`,
        batchNumber: `BT-${1000 + i}`,
        manufacturer: manufacturerFor(i),
      });
      i++;
    }
  }

  let created = 0;
  let updated = 0;
  for (const m of rows) {
    const existing = await Medicine.findOne({ name: m.name });
    if (existing) { Object.assign(existing, m); await existing.save(); updated++; }
    else { await Medicine.create(m); created++; }
  }
  return { total: rows.length, created, updated };
}

if (require.main === module) {
  (async () => {
    await mongoose.connect(env.mongoUri);
    const r = await seedMedicines();
    console.log(`\x1b[32mSeeded pharmacy inventory: ${r.created} created, ${r.updated} updated (of ${r.total}).\x1b[0m`);
    await mongoose.disconnect();
  })().catch((e) => { console.error('Medicine seed failed:', e.message); process.exit(1); });
}

module.exports = { seedMedicines, GROUPS };
