// Hospital contact details.
//
// Kept in one place so Help, Contact and Emergency screens can't drift apart.
// Replace these with the real numbers before release — the app links straight
// into the dialler, so a wrong number is worse than no number.

export const HOSPITAL = {
  name: 'CDA Hospital',
  city: 'Islamabad',
  address: 'Sector G-6/2, Islamabad, Pakistan',

  // Reception — general enquiries, appointment questions.
  reception: '+92511234567',
  receptionLabel: '051-123 4567',

  // Emergency — always answered.
  emergency: '1122',
  emergencyLabel: '1122',

  // Ambulance dispatch.
  ambulance: '115',
  ambulanceLabel: '115',

  email: 'support@cdahospital.pk',

  // Opening hours for the OPD. The queue closes earlier than the building.
  opdHours: '9:00 AM – 2:00 PM',
  opdBreak: '11:30 AM – 12:00 PM',
  opdDays: 'Monday – Friday',
};

export default HOSPITAL;
