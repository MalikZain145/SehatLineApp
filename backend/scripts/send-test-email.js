// Whitebox testing email — sends a branded SehatLine email to the testers.
//
// Run:  node scripts/send-test-email.js
//
// Uses the same premium SehatLine look (Capital Hospital / CDA footer) as the
// rest of the app's emails. Needs a WORKING Gmail App Password in .env
// (EMAIL_USER + EMAIL_APP_PASSWORD); if those aren't valid, each send falls
// back to a terminal log instead of actually delivering.

const { sendBrandedEmail } = require('../src/services/email.service');

const RECIPIENTS = [
  'kinzayymalikk.7867@gmail.com',
  'hirarahim465@gmail.com',
];

const SUBJECT = 'SehatLine Whitebox testing';
const TITLE = 'SehatLine Whitebox Testing';

const BODY = `
  <p style="font-size:14px;color:#5A6B7B;margin:0 0 12px">This is a <b>whitebox testing</b> message from the SehatLine system.</p>

  <div style="margin:16px 0;padding:14px 16px;background:#EDF7F5;border-left:3px solid #0BAA9D;border-radius:8px">
    <p style="margin:0;font-size:13px;color:#0f2233">
      Email sent by <b>Muhammad Zain Ul Abideen</b> via Server Control Station.
    </p>
  </div>

  <p style="font-size:14px;color:#E5484D;font-weight:700;margin:14px 0 0">
    📸 Please share a screenshot of this email in the group immediately when you read it.
  </p>
`;

const TEXT =
  'SehatLine Whitebox testing. Email sent by Muhammad Zain Ul Abideen via Server Control Station. '
  + 'Please share a screenshot of this email in the group immediately when you read it.';

(async () => {
  console.log(`\nSending SehatLine Whitebox testing email to ${RECIPIENTS.length} recipient(s)...\n`);

  const results = [];
  for (const to of RECIPIENTS) {
    const r = await sendBrandedEmail(to, SUBJECT, TITLE, BODY, TEXT);
    results.push({ to, ...r });
  }

  const delivered = results.filter((r) => r.sent).map((r) => r.to);
  const fell = results.filter((r) => !r.sent).map((r) => r.to);

  if (delivered.length) console.log(`\n✅ email sent to these emails: ${delivered.join(', ')}`);
  if (fell.length) {
    console.log(`\n⚠️  Not delivered (check EMAIL_APP_PASSWORD in .env): ${fell.join(', ')}`);
    console.log('   The email body was logged above so you can still verify the content.');
  }

  console.log('');
  process.exit(0);
})();
