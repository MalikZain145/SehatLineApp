// Blood donor↔recipient matching rules for the Blood Donor Network.

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

// Standard ABO/Rh compatibility chart.
// Key = donor group → the recipient groups that donor can safely give to.
const CAN_DONATE_TO = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // universal donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'], // universal recipient, but can only donate to AB+
};

// Given a recipient's blood group, which donor groups can give to them?
function compatibleDonorGroups(recipientGroup) {
  return BLOOD_GROUPS.filter((donorGroup) => CAN_DONATE_TO[donorGroup].includes(recipientGroup));
}

// Whole-blood donors need ~90 days between donations.
const DONATION_GAP_DAYS = 90;

function isEligibleToDonate(lastDonationAt) {
  if (!lastDonationAt) return true;
  const days = (Date.now() - new Date(lastDonationAt).getTime()) / (1000 * 60 * 60 * 24);
  return days >= DONATION_GAP_DAYS;
}

function nextEligibleDate(lastDonationAt) {
  if (!lastDonationAt) return null;
  const d = new Date(lastDonationAt);
  d.setDate(d.getDate() + DONATION_GAP_DAYS);
  return d;
}

module.exports = {
  BLOOD_GROUPS, CAN_DONATE_TO,
  compatibleDonorGroups, isEligibleToDonate, nextEligibleDate, DONATION_GAP_DAYS,
};
