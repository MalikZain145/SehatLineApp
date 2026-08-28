/* Part 2: chapters 8-15 + references + appendix, then build the .docx. */
const m = require('./gen_thesis');
const { kids, H1, H2, H3, P, T, BUL, NUM, TBL, SP, push, HDR, SLATE, GREY, A4,
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Header, Footer, PageNumber, LevelFormat, TableOfContents } = m;
const fs = require('fs');

// ---------- CHAPTER 8 : API ----------
push(H1('Chapter 8 — API Reference'));
push(P('SehatLine’s backend exposes 183 RESTful endpoints, grouped into six modules and mounted under /api. The distribution by HTTP method is 80 GET (reads), 76 POST (actions/creates), 16 PATCH (partial updates) and 11 DELETE (removals). Every endpoint returns a consistent JSON envelope of the form { success, code?, message?, ...data }. All endpoints except health, sign-up/login and password-reset require a valid JWT (Authorization: Bearer) and, where applicable, a matching device fingerprint. The following tables list the endpoints of each module together with their purpose and the portal/screen that consumes them.'));

function apiTable(title, base, rows) {
  push(H2(title));
  push(P([T('Base path: ', { bold: true }), T('/api' + base, { italics: true })]));
  push(TBL(['Method & Path', 'Purpose', 'Used by (portal / screen)'],
    rows.map((r) => [r[0], r[1], r[2]]), [2650, 3576, 2800]));
}

apiTable('8.1 Authentication & Account  (/api/auth)', '/auth', [
  ['POST /signup', 'Register a new patient (with CNIC data)', 'Signup screen'],
  ['POST /check-availability', 'Check email/phone/CNIC uniqueness live', 'Signup screen'],
  ['POST /login', 'Email/phone + password login', 'Login screen'],
  ['POST /fingerprint-login', 'Biometric login with device fingerprint', 'Login (biometric)'],
  ['POST /cnic/verify', 'OCR-verify a CNIC card image', 'Signup (CNIC scan)'],
  ['POST /forgot/request', 'Send a password-reset code', 'Forgot-Password'],
  ['POST /forgot/verify', 'Verify the reset code', 'Forgot-Password'],
  ['POST /forgot/reset', 'Set a new password', 'Forgot-Password'],
  ['GET /me', 'Return the current authenticated user', 'App boot / SessionContext'],
  ['GET /heartbeat', 'Keep the session alive / detect timeout', 'App (background heartbeat)'],
  ['POST /enroll-fingerprint', 'Enrol this device for biometric login', 'Settings (patient)'],
  ['POST /logout', 'End the current session', 'All portals (logout)'],
  ['POST /push-token, /push-token/remove', 'Register/remove Expo push token', 'App (notifications)'],
  ['GET /settings', 'Fetch account settings', 'Settings screens'],
  ['PATCH /settings/preferences|profile|profile-pic', 'Update prefs / profile / photo', 'Settings / Edit-Profile'],
  ['POST /settings/password|verify-password|force-password', 'Change / verify / force password', 'Change-Password'],
  ['POST /settings/biometric', 'Enable/disable biometric login', 'Settings'],
  ['POST /settings/rating', 'Submit an app rating', 'Settings / Feedback'],
  ['GET /account/summary', 'Account ownership summary', 'Account-Ownership'],
  ['POST /account/deactivate, /account/delete', 'Deactivate or delete the account', 'Account settings'],
]);

apiTable('8.2 Patient  (/api/patient)', '/patient', [
  ['GET /chronic/config', 'Chronic-OPD configuration', 'Chronic dashboard'],
  ['POST /tokens/generate', 'Generate a staggered OPD token', 'Generate-Token'],
  ['GET /tokens/active', 'The patient’s active token', 'Token-Journey / Home'],
  ['GET /tokens/queue/:department', 'Live queue for a department', 'Live-Queue screens'],
  ['GET /queues/summary', 'Summary of all department queues', 'Live-Queue tracker'],
  ['POST /tokens/:id/advance', 'Advance the token (pharmacy/lab/complete/cancel-lab)', 'Token-Journey'],
  ['POST /tokens/call-next', 'Simulate calling the next patient', 'Live-Queue (demo)'],
  ['GET /stats', 'Patient dashboard statistics', 'Home / Dashboard'],
  ['GET /doctors', 'List doctors (booking)', 'Doctor-List / Book'],
  ['GET /appointments/slots|active', 'Cardiology slots / active appointment', 'Book-Appointment'],
  ['POST /appointments/:id/reschedule', 'Reschedule an appointment', 'Reschedule'],
  ['GET /feedback/pending, POST /feedback', 'Pending feedback / submit review', 'Feedback'],
  ['GET/POST /reports, /reports/demo, GET/DELETE /reports/:id', 'Lab reports list / seed / detail / delete', 'My-Reports / Report-Detail'],
  ['GET /vitals, /vitals/analysis, POST/DELETE /vitals', 'Vitals log, analysis, add/remove', 'Vitals-Logger'],
  ['GET /health-camps(+/mine,/stats), POST /:id/register|unregister', 'Health-camp listing & registration', 'Health-Camps'],
  ['GET/POST /blood/... (donor, requests, respond, fulfill, cancel, stats)', 'Blood-donor network', 'Blood-Donor'],
  ['GET /prescriptions, /prescriptions/:id', 'Prescription list & detail', 'My-Prescriptions'],
  ['GET /medicines, POST/GET /orders, POST /orders/:id/cancel', 'Medicine bank & ordering', 'Medicine-Bank / Cart'],
  ['GET /notifications(+unread-count), POST read-all/:id/read, DELETE /:id', 'Notification centre', 'Notifications'],
]);

apiTable('8.3 Doctor  (/api/doctor)', '/doctor', [
  ['GET /dashboard', 'Doctor dashboard statistics', 'Doctor dashboard'],
  ['GET /queue, /my-queue', 'Department & personal live queue', 'Today-Queue / Call-Next'],
  ['GET/PATCH /profile, /settings, /availability', 'Profile, settings, working hours & days', 'Doctor Settings / Availability'],
  ['GET /consult/:tokenId', 'Load a consultation (token or appointment)', 'Consultation'],
  ['POST /consult/:tokenId/start|proceed|chronic', 'Start / complete (→ pharmacy) / mark chronic', 'Consultation'],
  ['GET /lab-tests, /medicines', 'Test & medicine catalogues', 'Consultation (dropdowns)'],
  ['GET /notifications, POST /notifications/read-all', 'Doctor notifications', 'Notifications'],
  ['GET /reviews, POST /reviews/:id/reply', 'Patient reviews & replies', 'Doctor-Reviews'],
  ['POST /report', 'Report a problem to admin', 'Help/Support'],
  ['GET/POST /camps, DELETE /camps/:id', 'Manage health camps', 'Health-Camps (doctor)'],
]);

apiTable('8.4 Administrator  (/api/admin)', '/admin', [
  ['GET /dashboard, /analytics, /system/metrics', 'Governance dashboards & metrics', 'Admin dashboard / Analytics'],
  ['GET /system/export, /system/cache, POST /system/cache/clear, /system/restart', 'System export, cache, restart', 'Admin System'],
  ['GET/POST /announcements, DELETE /announcements/:id', 'Announcements management', 'Announcements'],
  ['GET/POST /doctors, POST /doctors/bulk, /doctors/import-excel', 'Doctor CRUD, bulk & Excel import', 'Manage-Doctors'],
  ['PATCH/DELETE /doctors/:doctorId', 'Update / remove a doctor', 'Manage-Doctors'],
  ['GET /patients, PATCH /patients/:id/chronic, DELETE /patients/:id', 'Patient list, chronic classification, delete', 'Manage-Patients'],
  ['GET /ratings, PATCH /ratings/:id/reviewed', 'Review star ratings', 'Ratings'],
  ['GET /reports, PATCH /reports/:id/resolve, POST /reports/:id/reply', 'Problem reports & replies', 'Reports'],
  ['GET/POST /pharmacists, /pharmacists/bulk, /import-excel, DELETE /:id', 'Pharmacist management', 'Manage-Pharmacists'],
  ['GET /requisitions, PATCH /requisitions/:id/fulfil', 'Fulfil stock requisitions', 'Requisitions'],
  ['POST /change-password', 'Administrator password change', 'Admin Settings'],
]);

apiTable('8.5 Pharmacy  (/api/pharmacy)', '/pharmacy', [
  ['GET/PATCH /profile', 'Pharmacist profile', 'Profile / Edit-Profile'],
  ['GET /dashboard, /queue, /completed, /analytics', 'Dashboards & queues', 'Dashboard / Queue / Analytics'],
  ['GET /prescriptions/:id', 'Prescription detail', 'Prescription-Details'],
  ['POST /prescriptions/:id/prepare|ready|complete', 'Advance dispensing; complete → lab if tests', 'Queue / Prescription'],
  ['POST /prescriptions/:id/lp, GET /lp', 'Loan-prescription flow', 'Loan Prescriptions'],
  ['GET/POST /inventory, PATCH/DELETE /inventory/:id', 'Medicine inventory management', 'Inventory'],
  ['POST /report, POST/GET /requisitions', 'Report to admin; stock requisitions', 'Report / Requisition'],
  ['GET /backup, POST /backup, GET /backup/*/download', 'Backups & exports', 'Backup'],
]);

apiTable('8.6 Laboratory  (/api/laboratory)', '/laboratory', [
  ['GET/PATCH /profile', 'Lab-staff profile', 'Profile'],
  ['GET /dashboard, /queue, /completed, /analytics', 'Dashboards & queues', 'Dashboard / Queue / Analytics'],
  ['GET /prescriptions/:id', 'Test-detail sheet', 'Queue detail'],
  ['POST /queue/:id/status', 'Mark sample collected / processing', 'Queue'],
  ['POST /queue/:id/complete', 'Complete with results → creates LabReport', 'Queue'],
  ['POST /reports/upload', 'Upload a report by card number', 'Completed-Reports'],
  ['GET/POST /tests, GET /tests/:id, PATCH/DELETE /tests/:id', 'Test catalogue management', 'Test-Catalog'],
  ['GET/POST /inventory, PATCH/DELETE /inventory/:id, POST /inventory/:id/stock', 'Consumables inventory', 'Inventory'],
  ['POST/GET /requisitions, POST /report', 'Requisitions & report to admin', 'Requisitions / Report'],
]);

// ---------- CHAPTER 9 : Backend features & security ----------
push(H1('Chapter 9 — Backend Features and Security'));
push(H2('9.1 Layered Request Pipeline'));
push(P('Every API request passes through an ordered middleware pipeline before reaching a controller: secure HTTP headers (helmet), Cross-Origin Resource Sharing (CORS), a JSON/body-size limiter, request logging, a global rate limiter, a NoSQL-injection guard, then per-route authentication, authorisation and input validation. This defence-in-depth ordering ensures that malformed, oversized, unauthenticated or abusive requests are rejected as early and as cheaply as possible.'));
push(H2('9.2 Authentication'));
push(P('Authentication is based on stateless JSON Web Tokens (JWT). On successful login the server issues a signed token (7-day expiry) that the app attaches to every subsequent request. Passwords are never stored in plain text; they are salted and hashed with bcryptjs. In addition to email/password login, SehatLine supports on-device biometric login (fingerprint/Face ID) via a device-enrolment flow, and a live uniqueness check during sign-up.'));
push(H2('9.3 Session Management and Device Binding'));
push(P('Beyond the JWT, the backend maintains Session records to support inactivity timeout (a session is considered inactive after five minutes without activity) and device binding. Each request also carries a device-fingerprint hash; a mismatch between the token and the presenting device is treated as a session failure, which forces a re-login. This binds a session to the device it was created on and mitigates token theft.'));
push(H2('9.4 Authorisation (Role-Based Access Control)'));
push(P('Endpoints are protected by role guards so that, for example, only accounts with the doctor role may complete a consultation, only pharmacy accounts may dispense, and only administrators may manage staff. The five roles — patient, doctor, admin, pharmacy, laboratory — are enforced at the route layer, and object-level guards additionally prevent one doctor from opening another doctor’s appointment record.'));
push(H2('9.5 Input Validation'));
push(P('Request bodies are validated with the Zod schema library. The authentication module alone defines multiple object schemas covering sign-up, login and password flows, with typed, constrained string fields. A reusable middleware validates path parameters that must be MongoDB ObjectIds, rejecting malformed identifiers before any database query. Validation failures return a clear, structured error rather than a stack trace.'));
push(H2('9.6 Abuse Protection'));
push(P('A global rate limiter caps requests per client within a rolling one-minute window (the health check is exempt so uptime monitors are never throttled). A NoSQL-injection guard strips operator keys from user input, and the JSON body size is limited (default 10 MB) to prevent memory-exhaustion attacks. In production the server refuses to start unless a strong (32+ character) JWT secret and a real database URI are supplied, preventing accidental deployment with insecure defaults.'));
push(H2('9.7 Real-Time Layer'));
push(P('A Socket.IO server pushes live events — queue:update, pharmacy:update, laboratory:update, admin:update, blood:update, camp:update and system:restart — to subscribed clients. This is what makes the queue "live": when a patient is served or advanced, every watching device updates instantly without polling. The layer degrades gracefully: if the socket cannot connect, the app falls back to pull-to-refresh.'));
push(H2('9.8 Scheduled Backups and Reporting'));
push(P('A node-cron job performs an automated daily database backup (scheduled for 2:00 PM, at the close of the OPD session). The pharmacy and laboratory modules can export data to Excel via ExcelJS, and the queue engine renders a formatted PDF load-test report via PDFKit.'));
push(H2('9.9 Optical Character Recognition (OCR)'));
push(P('During sign-up, a photograph of the patient’s CNIC is processed on the server with tesseract.js (OCR) after image pre-processing with jimp (grayscale, contrast, thresholding). The card number and name are extracted and used to verify identity and pre-fill the registration form. This reduces manual data-entry error and strengthens the authenticity of patient records.'));

// ---------- CHAPTER 10 : AI & algorithms ----------
push(H1('Chapter 10 — Artificial Intelligence and Queueing Algorithms'));
push(P('SehatLine contains two distinct pieces of "intelligence": a machine-learning triage service that decides how urgently each patient should be seen, and an analytical queueing engine that models and optimises departmental waiting. This chapter describes both in detail.'));
push(H2('10.1 AI Triage Service'));
push(H3('10.1.1 Clinical Feature Set'));
push(P('The triage service represents each patient as a vector of fourteen clinical features: age, an elderly flag (60+), number of chronic conditions, a critical-condition flag, systolic and diastolic blood pressure, heart rate, blood-oxygen saturation (SpO2), blood sugar, temperature, a pregnancy flag, a disability flag, days since last visit, and number of missed appointments. Critical conditions are detected from a keyword set covering cardiac, stroke, renal, respiratory, cancer and seizure presentations.'));
push(H3('10.1.2 Ensemble Model'));
push(P('The urgency of a patient is scored on a 0–100 scale (higher = should be seen sooner). Two complementary models are trained and combined:'));
push(...BUL([
  [T('Gradient Boosting Regressor', { bold: true }), T(' — a robust gradient-boosted decision-tree model, well suited to tabular clinical data.')],
  [T('Multi-Layer Perceptron (MLP) Regressor', { bold: true }), T(' — a neural-network (deep-learning) component that captures smooth, non-linear interactions between features.')],
]));
push(P('At inference the two models’ predictions are averaged — a classic ensemble that is more stable and accurate than either model alone. A separately trained PyTorch deep model is also supported. Feature scaling (standardisation) is applied so that features on different numeric ranges (e.g., age vs. SpO2) contribute proportionately.'));
push(H3('10.1.3 Rule-Based Ground Truth and Fallback'));
push(P('A deterministic, vectorised urgency function encodes clinical priority directly: elderly patients, critical chronic conditions, and dangerous vitals (low SpO2, hypertensive crisis, very high blood sugar, fever, abnormal heart rate) raise urgency; pregnancy and disability add priority; long gaps since the last visit and missed appointments nudge it upward. This function serves two purposes: it generates the labelled data on which the ensemble is trained, and it acts as a zero-dependency fallback so that, even if the Python service or its trained weights are unavailable, patients are still prioritised sensibly. Scores map to four triage levels: critical (85+), high (65+), elderly (45+) and normal.'));
push(H3('10.1.4 Deployment and Graceful Degradation'));
push(P('The triage model is served by a Python FastAPI micro-service. The Node backend calls it over an internal HTTP channel; if the service does not respond in time, the backend logs a warning and transparently uses the rule-based fallback, so triage never blocks the patient flow. In hosted environments without Python the service is simply disabled and the rule-based engine is used throughout.'));
push(H2('10.2 Queue-Management Engine'));
push(P('The queue engine applies classical queueing theory to a hospital OPD. All rates are expressed per hour: λ is the arrival rate, μ is the service rate per doctor, and s is the number of doctors (servers).'));
push(H3('10.2.1 M/M/s (Erlang C)'));
push(P('Each department is modelled as an M/M/s queue. The Erlang C formula gives P(wait), the probability that an arriving patient finds all doctors busy and must wait. From it the engine derives the offered load a = λ/μ, the utilisation ρ = a/s, the average waiting time in queue Wq, the average number waiting Lq, and the corresponding time-in-system and number-in-system (W, L). A department is stable only while ρ < 1; beyond that the queue grows without bound.'));
push(H3('10.2.2 Non-Preemptive Priority (Cobham)'));
push(P('Because SehatLine triages patients into priority classes (critical > high/urgent > elderly > normal), the engine computes per-class waiting times using Cobham’s non-preemptive priority approximation for M/M/s. Higher-priority classes are served ahead of lower ones without interrupting a consultation in progress, so critical and elderly patients experience much shorter waits than the aggregate average, while lower-priority patients absorb the difference.'));
push(H3('10.2.3 Lag-SIPP Staffing'));
push(P('When a department is overloaded, the engine recommends the minimum number of doctors needed to meet a waiting-time target (default 15 minutes). It divides the session into periods, sizes each period independently (SIPP), and applies a one-period lag so that staffing covers the load that has just arrived rather than trailing it. In practice this yields small, realistic recommendations — typically zero to two extra doctors, or a modest extension of hours.'));
push(H3('10.2.4 Discrete-Event Validation'));
push(P('To confirm the analytical model, a discrete-event simulation generates patients with exponential inter-arrival and service times, assigns them priority classes in realistic proportions (critical 6%, high 5%, elderly 30%, normal 59%), and serves them with a fixed number of doctors. Averaged over multiple runs, the simulation reports doctor utilisation, the wait experienced by ordinary patients, and — most importantly — the peak physical crowd, which is the quantity SehatLine is designed to reduce.'));

// ---------- CHAPTER 11 : Results / metrics ----------
push(H1('Chapter 11 — Queue Optimisation Results'));
push(P('This chapter reports the measured benefit of SehatLine’s queue management. The premise is deliberately conservative: the hospital does not hire more doctors. It runs a fixed, small team — modelled here as 4 Chronic-OPD doctors (about 4 minutes per follow-up, μ = 15/hr each) and 6 Cardiology doctors (about 6 minutes per consult, μ = 10/hr each) — over a five-hour session (9:00 AM – 2:00 PM). The only thing that changes is when patients physically arrive: instead of everyone queueing at opening time, SehatLine issues staggered tokens with an estimated time, so only a small group is ever physically present at once. The tables below, produced by the discrete-event priority simulation (averaged over repeated runs), quantify the effect at increasing daily loads.'));
push(H2('11.1 Chronic OPD (4 fixed doctors)'));
push(TBL(['Patients / session', 'Doctor utilisation', 'Normal-patient wait', 'Peak physical crowd', 'Rush reduction', 'Add doctors'],
  [
    ['100', '32%', '0.4 min', '3', '97%', 'none'],
    ['200', '65%', '1.5 min', '9', '96%', 'none'],
    ['300', '93%', '18.2 min', '26', '91%', '+1'],
    ['400', '99%', '73.1 min', '95', '76%', '+2'],
  ], [1900, 1500, 1650, 1650, 1226, 1200]));
push(H2('11.2 Cardiology (6 fixed doctors)'));
push(TBL(['Patients / session', 'Doctor utilisation', 'Normal-patient wait', 'Peak physical crowd', 'Rush reduction', 'Add doctors'],
  [
    ['100', '34%', '0.3 min', '4', '97%', 'none'],
    ['200', '64%', '1.4 min', '8', '96%', 'none'],
    ['300', '96%', '18.5 min', '26', '91%', '+1'],
    ['400', '100%', '89.4 min', '101', '75%', '+3'],
  ], [1900, 1500, 1650, 1650, 1226, 1200]));
push(H2('11.3 Interpretation'));
push(P('The key metric is the rush reduction — the percentage by which the peak physical crowd is smaller than the total number of patients. Across realistic daily loads (100–300 patients per session with the existing 4–6 doctors), SehatLine reduces the peak physical crowd by approximately 91–97%. In concrete terms, a Chronic-OPD session of 200 patients that would otherwise mean up to 200 people in the hall at once instead peaks at about 9 people physically waiting, while ordinary patients wait on average under two minutes once their token time arrives. Even under heavy overload (400 patients, well beyond the doctors’ comfortable capacity), the rush is still cut by roughly three-quarters, and the engine correctly flags that one to three additional doctors — or extended hours — would be needed to hold the 15-minute target. Crucially, these gains require no additional staff at normal loads: they come entirely from rescheduling physical arrival through staggered tokens.'));

// ---------- CHAPTER 12 : Testing ----------
push(H1('Chapter 12 — Testing Plan and Strategy'));
push(P('SehatLine’s quality assurance follows a comprehensive, seventeen-category testing strategy spanning functional correctness, security, performance and compatibility. This chapter defines each category, its priority, its objective, the approach taken, and its current status. Integration and load testing have already been carried out; the remaining critical categories form the immediate test priority.'));
push(TBL(['#', 'Test Type', 'Priority', 'Status'],
  [
    ['1', 'Unit Testing', 'Critical', 'Planned'],
    ['2', 'Integration Testing', 'Critical', 'Done'],
    ['3', 'Load Testing', 'High', 'Done'],
    ['4', 'API Testing', 'Critical', 'Planned'],
    ['5', 'Functional Testing', 'Critical', 'Planned'],
    ['6', 'Authentication Testing', 'Critical', 'Planned'],
    ['7', 'Authorization Testing', 'Critical', 'Planned'],
    ['8', 'Security Testing', 'Critical', 'Planned'],
    ['9', 'Stress Testing', 'High', 'Planned'],
    ['10', 'Spike Testing', 'High', 'Planned'],
    ['11', 'Soak (Endurance) Testing', 'High', 'Planned'],
    ['12', 'Database Testing', 'Critical', 'Planned'],
    ['13', 'UI/UX Testing', 'High', 'Planned'],
    ['14', 'Compatibility Testing (Android/iOS)', 'High', 'Planned'],
    ['15', 'Network Testing', 'High', 'Planned'],
    ['16', 'Recovery Testing', 'High', 'Planned'],
    ['17', 'Regression Testing', 'High', 'Ongoing'],
  ], [700, 4200, 1900, 2226]));

const tt = (n, name, prio, obj, how, status) => {
  push(H3(`12.${n} ${name}  (Priority: ${prio})`));
  push(P([T('Objective. ', { bold: true }), T(obj)]));
  push(P([T('Approach. ', { bold: true }), T(how)]));
  push(P([T('Status. ', { bold: true }), T(status)]));
};
tt(1, 'Unit Testing', 'Critical',
  'Verify that individual functions and units — the Erlang C and priority formulas, the urgency feature-builder, token-number generation, dosing quantity (per-day × days), validation schemas and utility helpers — behave correctly in isolation.',
  'Write focused test cases (e.g., with Jest) that feed known inputs to each pure function and assert exact outputs, including boundary and error cases (unstable queues, empty inputs, invalid CNIC).',
  'Planned as the immediate critical priority; the queue engine and validation layer are the first targets because they are pure and high-value.');
tt(2, 'Integration Testing', 'Critical',
  'Confirm that modules work together across the full patient journey: consultation → prescription → pharmacy dispense → laboratory queue → lab report, plus authentication and notifications.',
  'End-to-end flows were exercised against a running backend and the Atlas database, verifying that a doctor’s "proceed" creates a prescription and routes the token to pharmacy, that dispensing routes test-carrying patients to the lab (for both chronic-OPD tokens and cardiology appointments), and that completing a lab test produces a patient-visible report.',
  'Done. These integration paths have been executed and verified end-to-end.');
tt(3, 'Load Testing', 'High',
  'Measure system behaviour and the queue-reduction benefit under realistic and heavy OPD loads.',
  'A discrete-event priority simulation and the analytical M/M/s engine were run across loads of 100–400 patients for both departments; results are reported in Chapter 11 and rendered to a PDF report. A separate application load-test script exercises the API.',
  'Done. Reduction of 91–97% at realistic loads was measured and documented.');
tt(4, 'API Testing', 'Critical',
  'Validate every endpoint’s contract — status codes, JSON envelope, error codes, authentication requirements and edge cases — across all six modules.',
  'Exercise each of the 183 endpoints (e.g., with a REST client or automated collection): valid requests return the expected data; missing/invalid tokens return 401 with the correct code; malformed ObjectIds and bodies are rejected by validation; role-restricted endpoints reject the wrong role.',
  'Planned (critical). Health, login and core patient/doctor/pharmacy/lab endpoints have been verified manually during integration; systematic coverage is the next step.');
tt(5, 'Functional Testing', 'Critical',
  'Verify that each feature meets its functional requirement from the user’s perspective, in every portal.',
  'Execute scripted scenarios per role: register with CNIC, generate a token, watch the live queue, complete a consultation, dispense, run a lab test, receive notifications, log vitals, book/reschedule appointments, and use the blood-donor network.',
  'Planned (critical).');
tt(6, 'Authentication Testing', 'Critical',
  'Ensure only legitimate users can obtain a session, and that biometric, password and reset flows are correct and safe.',
  'Test valid and invalid logins, expired/absent tokens, biometric enrolment and login, forgot-password (request/verify/reset), inactivity timeout, and sign-up uniqueness checks.',
  'Planned (critical).');
tt(7, 'Authorization Testing', 'Critical',
  'Ensure role-based access control cannot be bypassed and that object-level ownership is enforced.',
  'Attempt cross-role access (e.g., a patient token calling admin/pharmacy endpoints), cross-object access (one doctor opening another’s appointment), and privilege escalation; confirm all are rejected with 403/appropriate codes.',
  'Planned (critical).');
tt(8, 'Security Testing', 'Critical',
  'Validate the system’s defences: injection, headers, rate limiting, input validation, secret handling and transport.',
  'Attempt NoSQL-injection payloads (rejected by the guard), oversized bodies (rejected by the limiter), rapid request floods (throttled), malformed input (rejected by Zod), and verify secure headers (helmet) and that production refuses insecure defaults.',
  'Planned (critical). Core protections (helmet, CORS, rate-limit, Zod, NoSQL guard, ObjectId validation, device binding) are implemented and will be adversarially tested.');
tt(9, 'Stress Testing', 'High',
  'Determine the breaking point of the backend by pushing beyond expected load.',
  'Ramp concurrent virtual users against the API until latency and error rates rise sharply; record the saturation point and failure mode (graceful throttling via the rate limiter is the expected behaviour).',
  'Planned.');
tt(10, 'Spike Testing', 'High',
  'Verify resilience to sudden surges — e.g., the opening-time rush when many patients act at once.',
  'Apply an abrupt jump from low to very high concurrency and back; confirm the system recovers, no requests are lost beyond the rate-limit policy, and the live queue remains consistent.',
  'Planned.');
tt(11, 'Soak (Endurance) Testing', 'High',
  'Detect memory leaks, connection exhaustion or degradation over long continuous operation.',
  'Run a sustained moderate load for an extended period (hours) while monitoring memory, database connections and response times for drift; confirm the daily backup cron and socket layer remain stable.',
  'Planned.');
tt(12, 'Database Testing', 'Critical',
  'Validate schema integrity, referential consistency, indexing and the correctness of reads/writes.',
  'Verify Mongoose validation (required fields, enums, defaults), referential links (Token↔Prescription↔LabReport), atomic token-number generation (Counter), uniqueness constraints, and that seed/backup/restore operate correctly.',
  'Planned (critical). Referential flow verified during integration; systematic schema and index tests to follow.');
tt(13, 'UI/UX Testing', 'High',
  'Ensure the interface is consistent, accessible, theme-correct and usable across screens.',
  'Review every screen in light and dark themes, confirm consistent left-aligned headers and screen-coloured backgrounds, verify navigation, loading skeletons, empty states, and that bottom-anchored sheets dismiss correctly on small devices.',
  'Planned. Substantial UI/theme polish (dark mode, header alignment, page tint) has already been applied.');
tt(14, 'Compatibility Testing (Android / iOS)', 'High',
  'Confirm the single React Native codebase behaves correctly on both platforms and across device sizes.',
  'Run the application on Android and iOS devices/emulators of varying screen sizes and OS versions; verify layout, safe-area handling, biometric APIs, camera/OCR, notifications and animations on each.',
  'Planned. Android build produced via EAS; iOS-specific issues (e.g., animation and edit-profile responsiveness) have been addressed.');
tt(15, 'Network Testing', 'High',
  'Validate behaviour under poor, intermittent or absent connectivity.',
  'Simulate high latency, packet loss and offline conditions; confirm request timeouts produce clear messages, the socket layer reconnects, cached data is used where appropriate, and no operation hangs the UI.',
  'Planned. Client request timeouts and socket auto-reconnect are already implemented.');
tt(16, 'Recovery Testing', 'High',
  'Verify the system recovers cleanly from failures — backend restart, database disconnect, or service outage.',
  'Force a backend restart and a temporary database/AI-service outage during operation; confirm sessions recover, the rule-based triage fallback engages, and clients reconnect without data loss.',
  'Planned. Graceful degradation (optional AI, optional socket, restart handling) is built in.');
tt(17, 'Regression Testing', 'High',
  'Ensure that new changes do not break previously working functionality.',
  'Maintain a checklist of core journeys and re-run them after each change; as automated unit/API suites are added, run them on every iteration to catch regressions early.',
  'Ongoing throughout the Agile iterations; to be automated alongside the unit and API suites.');

// ---------- CHAPTER 13 : Deployment ----------
push(H1('Chapter 13 — Deployment'));
push(H2('13.1 Database'));
push(P('The production database is hosted on MongoDB Atlas (a managed cloud MongoDB service). A seed routine provisions the demonstration data: staff logins for every role, a set of doctors, and pharmacy and laboratory catalogues and inventory. Network access and a strong connection secret are configured through environment variables rather than committed to source control.'));
push(H2('13.2 Backend'));
push(P('The backend is a long-running Node.js process (it maintains WebSocket connections and a scheduled backup job), and is therefore deployed on a persistent server rather than a short-lived serverless function. The repository is prepared for multiple hosting targets — a container image (Dockerfile), a platform blueprint, and a documented cloud runbook — so the same backend can run on any persistent-server host. The mobile application discovers the current backing URL from a small configuration file, so the backend can move between hosts without rebuilding the application.'));
push(H2('13.3 Mobile Application'));
push(P('The Android application is built with Expo Application Services (EAS) into an installable APK. The build configuration pins the runtime, bundles the SehatLine icon and splash branding, and requests only the permissions the app uses (camera for CNIC capture, biometric for login, notifications). The same codebase targets iOS.'));

// ---------- CHAPTER 14 : Evaluation ----------
push(H1('Chapter 14 — Results and Evaluation'));
push(P('SehatLine meets its stated objectives. The system digitises the complete outpatient journey across five integrated portals; it eliminates the physical waiting crowd (a measured 91–97% reduction of the peak crowd at realistic loads with unchanged staff); it prioritises patients through an AI ensemble with a robust rule-based fallback; it delivers structured chronic care, laboratory reporting and a blood-donor network; and it is secured with strong authentication, biometric login, identity verification, session/device binding and validated, rate-limited APIs. The queue benefit was established both analytically (M/M/s with priority) and empirically (discrete-event simulation), giving confidence that the result is a property of the design rather than of a single test run.'));
push(P('The evaluation also delineates the system’s honest limits. The reported reduction assumes patients respect their staggered token times; real-world adherence will moderate the ideal figures. Under genuine overload the engine correctly reports that additional doctors or extended hours are unavoidable — no scheduling scheme can serve more patients than the doctors’ capacity. The AI triage is trained against a clinically-motivated rule function rather than a large labelled hospital dataset; deploying it on real historical data is a natural next step.'));

// ---------- CHAPTER 15 : Conclusion ----------
push(H1('Chapter 15 — Conclusion and Future Work'));
push(H2('15.1 Conclusion'));
push(P('SehatLine demonstrates that a well-designed software system can solve a stubborn, physical problem — hospital overcrowding — without the one resource public hospitals cannot easily add: more doctors. By combining staggered digital tokens, a live real-time queue, AI-assisted triage, and an integrated flow across consultation, pharmacy and laboratory, the system removes the physical rush, protects the most vulnerable patients, and modernises chronic care, all on a single cross-platform mobile application backed by a secure, validated API and a rigorous queueing model.'));
push(H2('15.2 Future Work'));
push(...BUL([
  'Train and validate the triage ensemble on a large, de-identified historical hospital dataset, and add explainability so clinicians can see why a patient was prioritised.',
  'Integrate physical infrastructure: self-service token kiosks, waiting-hall displays driven by the live queue, and optional SMS/WhatsApp reminders for patients without the app.',
  'Complete and automate the full test suite (unit, API, security, stress, spike, soak) in a continuous-integration pipeline.',
  'Add multilingual (Urdu) UI and voice guidance to widen accessibility.',
  'Extend analytics into predictive staffing — forecasting daily load and recommending schedules ahead of time using the Lag-SIPP engine.',
  'Pursue formal clinical evaluation with the hospital to measure real-world adherence and outcome improvements.',
]));

// ---------- References ----------
push(H1('References'));
const refs = [
  'Gross, D., Shortle, J. F., Thompson, J. M., & Harris, C. M. Fundamentals of Queueing Theory. Wiley.',
  'Cobham, A. "Priority Assignment in Waiting Line Problems." Operations Research.',
  'Green, L. V., Kolesar, P. J., & Whitt, W. "Coping with Time-Varying Demand When Setting Staffing Requirements for a Service System." Production and Operations Management (SIPP / Lag-SIPP).',
  'Erlang, A. K. "Solution of some Problems in the Theory of Probabilities of Significance in Automatic Telephone Exchanges."',
  'Friedman, J. H. "Greedy Function Approximation: A Gradient Boosting Machine." Annals of Statistics.',
  'Pedregosa, F. et al. "Scikit-learn: Machine Learning in Python." JMLR.',
  'Node.js Foundation. Node.js Documentation. https://nodejs.org',
  'Express.js. Web Framework Documentation. https://expressjs.com',
  'MongoDB Inc. MongoDB and Mongoose Documentation. https://www.mongodb.com',
  'Meta Open Source. React Native Documentation. https://reactnative.dev',
  'Expo. Expo & EAS Build Documentation. https://docs.expo.dev',
  'Socket.IO. Real-time Engine Documentation. https://socket.io',
  'Tesseract OCR (tesseract.js). https://tesseract.projectnaptha.com',
  'Colin McDonnell. Zod: TypeScript-first schema validation. https://zod.dev',
];
push(...refs.map((r, i) => new Paragraph({ spacing: { after: 90, line: 268 }, children: [new TextRun({ text: `[${i + 1}]  `, font: 'Calibri', size: 20, bold: true, color: HDR }), new TextRun({ text: r, font: 'Calibri', size: 20, color: SLATE })] })));

// ---------- Appendix ----------
push(H1('Appendix A — System Summary'));
push(TBL(['Item', 'Value'],
  [
    ['Application', 'SehatLine — Smart Hospital Queue & Chronic-Care System'],
    ['Platforms', 'Android and iOS (React Native / Expo SDK 54)'],
    ['Backend', 'Node.js 20 + Express 4 (version 2.1.0)'],
    ['Application version', '5.3.0'],
    ['Database', 'MongoDB (Mongoose 8) on Atlas — 26 models'],
    ['REST endpoints', '183 (80 GET, 76 POST, 16 PATCH, 11 DELETE)'],
    ['Modules / portals', 'Patient, Doctor, Administrator, Pharmacy, Laboratory'],
    ['Real-time', 'Socket.IO 4'],
    ['AI triage', 'Gradient Boosting + MLP ensemble (+ PyTorch), rule-based fallback, 14 features'],
    ['Queue engine', 'M/M/s (Erlang C) + Cobham priority + Lag-SIPP + discrete-event simulation'],
    ['Measured rush reduction', '≈ 91–97% at realistic loads (100–300 patients/session)'],
    ['Security', 'JWT, bcryptjs, sessions + device binding, Zod, helmet, CORS, rate-limit, NoSQL guard, OCR CNIC verification, biometric login'],
    ['Methodology', 'Agile / iterative (9 development phases)'],
  ], [2600, 6426]));

// ---------- Appendix B : Data Dictionary ----------
push(H1('Appendix B — Data Dictionary (Key Models)'));
push(P('The following tables document the principal fields of the most important data models. Types are given as stored in MongoDB via Mongoose; ObjectId denotes a reference to another document.'));
push(H2('B.1 User'));
push(TBL(['Field', 'Type', 'Description'],
  [
    ['name, email, phone', 'String', 'Account identity and contact details.'],
    ['password', 'String (hashed)', 'bcryptjs-hashed password; never stored in plain text.'],
    ['role', 'Enum', 'patient | doctor | admin | pharmacy | laboratory.'],
    ['cnic, cdaCard', 'String', 'National identity and hospital (CDA) card numbers.'],
    ['dob, address', 'String', 'Demographics used for triage and records.'],
    ['isChronic (chronic flags)', 'Boolean', 'Whether the patient is enrolled in chronic OPD.'],
    ['doctorId, specialization, department, room', 'String', 'Doctor-specific profile fields.'],
    ['onDuty, workingHours, shift', 'Mixed', 'Doctor availability and schedule.'],
    ['counterNumber', 'String', 'Serving counter (pharmacy/laboratory staff).'],
    ['cnicFrontImage, cnicBackImage', 'String', 'CNIC images captured for OCR verification.'],
    ['device fingerprint, biometric, notification prefs', 'Mixed', 'Security and preference settings.'],
  ], [2500, 1700, 4826]));
push(H2('B.2 Token'));
push(TBL(['Field', 'Type', 'Description'],
  [
    ['user', 'ObjectId', 'The patient the token belongs to.'],
    ['tokenNumber', 'String', 'Human-readable token (atomic Counter-generated).'],
    ['department', 'Enum', 'chronic_opd | pharmacy | laboratory | done.'],
    ['status', 'Enum', 'in-queue | in-progress | pharmacy | laboratory | completed | cancelled …'],
    ['priorityScore, priorityLevel, priorityReason', 'Number/String', 'AI-triage urgency score, level and explanation.'],
    ['age, isElderly, hasCriticalCondition, conditions', 'Mixed', 'Clinical factors feeding the triage.'],
    ['assignedDoctor {doctorId, name, specialization, room}', 'Object', 'The doctor handling the consultation.'],
    ['diagnosis, clinicalNotes', 'String', 'Recorded during consultation.'],
    ['labRequired, labRequested, prescribedTests', 'Mixed', 'Laboratory-routing state.'],
    ['journey log, timestamps', 'Array/Date', 'Auditable trail of the token’s progress.'],
  ], [2900, 1500, 4626]));
push(H2('B.3 Prescription'));
push(TBL(['Field', 'Type', 'Description'],
  [
    ['token, tokenNumber, user', 'ObjectId/String', 'Links the prescription to the token and patient.'],
    ['patient {name, cnic, cdaCard, age …}', 'Object', 'Snapshot of the patient at issue time.'],
    ['doctor {doctorId, name, specialization}', 'Object', 'Issuing doctor.'],
    ['medicines', '[String]', 'Prescribed medicines (display).'],
    ['medicineItems {name, form, perDay, days, qty, medicineId}', '[Object]', 'Structured dosing; qty = perDay × days, used for stock decrement.'],
    ['tests', '[String]', 'Prescribed laboratory tests.'],
    ['pharmacyStatus', 'Enum', 'pending | preparing | ready | dispensed.'],
    ['labStatus', 'Enum', 'none | pending | collected | processing | completed.'],
    ['labQueued', 'Boolean', 'Routes tokenless (cardiology) patients into the lab queue.'],
    ['labReport, labCounter', 'ObjectId/String', 'Link to the resulting report and serving counter.'],
  ], [3100, 1500, 4426]));
push(H2('B.4 LabReport & Notification'));
push(TBL(['Model.Field', 'Type', 'Description'],
  [
    ['LabReport.user / token', 'ObjectId', 'Patient and originating token (null for card-number uploads).'],
    ['LabReport.title, category, results[]', 'Mixed', 'Report title, category and parameter results with reference ranges.'],
    ['LabReport.pdfName, pdfData', 'String', 'Optional uploaded PDF (base64).'],
    ['LabReport.source', 'String', 'lab (issued by laboratory) vs demo/seed.'],
    ['Notification.user', 'ObjectId', 'Recipient of the notification.'],
    ['Notification.type', 'Enum', 'system | order | lab | reminder …'],
    ['Notification.title, body, icon, screen, refId', 'Mixed', 'Content and deep-link target.'],
    ['Notification.read, createdAt', 'Boolean/Date', 'Read state and time.'],
  ], [3100, 1500, 4426]));

// ---------- Appendix C : Use cases ----------
push(H1('Appendix C — Use-Case Catalogue'));
push(P('Representative use cases capture the primary interactions of each actor with the system.'));
const uc = (id, name, actor, pre, flow, post) => {
  push(H3(`${id}: ${name}`));
  push(P([T('Actor: ', { bold: true }), T(actor), T('    Precondition: ', { bold: true }), T(pre)]));
  push(P([T('Main flow: ', { bold: true }), T(flow)]));
  push(P([T('Postcondition: ', { bold: true }), T(post)]));
};
uc('UC-01', 'Register with CNIC verification', 'Patient (unregistered)', 'The app is installed.',
  'The patient enters details, captures the CNIC; the server runs OCR, extracts the card number/name and checks uniqueness; the account is created and optional biometric enrolment is offered.',
  'A verified patient account exists.');
uc('UC-02', 'Generate a staggered token', 'Patient', 'The patient is authenticated and (for chronic OPD) classified.',
  'The patient requests a token; the server computes the priority score, assigns a token number and an estimated time, and returns the department and position.',
  'A token is issued and appears in the live queue.');
uc('UC-03', 'Track the live queue', 'Patient', 'A token exists.',
  'The app subscribes to queue updates; as patients are served, the position and estimated time update in real time via Socket.IO.',
  'The patient knows when to arrive, avoiding the physical crowd.');
uc('UC-04', 'Conduct a consultation', 'Doctor', 'A patient token is in the doctor’s queue.',
  'The doctor calls the next patient, records diagnosis and notes, prescribes structured medicines and tests, and proceeds; the token is routed to the pharmacy.',
  'A prescription is created and the patient advances to pharmacy.');
uc('UC-05', 'Dispense medicines', 'Pharmacist', 'A prescription is in the pharmacy queue.',
  'The pharmacist prepares and dispenses; stock is decremented by qty; if tests are present the patient is routed to the laboratory, else the journey completes.',
  'Medicines dispensed; patient routed to lab or completed.');
uc('UC-06', 'Complete a laboratory test', 'Laboratory staff', 'A test-carrying prescription is in the lab queue.',
  'Staff collect the sample, mark processing, then complete with results; a LabReport is created and the token journey finishes.',
  'A patient-visible lab report is issued.');
uc('UC-07', 'Classify a chronic patient', 'Administrator', 'A patient account exists.',
  'The administrator marks the patient as chronic, enabling the chronic-OPD flow for that patient.',
  'The patient can access chronic-OPD tokening.');
uc('UC-08', 'Manage staff', 'Administrator', 'Administrator is authenticated.',
  'The administrator creates, imports (bulk/Excel), updates or removes doctors and pharmacists.',
  'Staff records are updated.');
uc('UC-09', 'Biometric login', 'Patient', 'The device is enrolled.',
  'The patient authenticates with fingerprint/Face ID; the app sends the device fingerprint; the server issues a session.',
  'The patient is logged in without a password.');
uc('UC-10', 'Recover a password', 'Any user', 'The account exists.',
  'The user requests a reset code, verifies it, and sets a new password.',
  'The password is updated and the user can log in.');

// ---------- Appendix D : Screen inventory ----------
push(H1('Appendix D — Screen Inventory'));
push(P('The mobile application comprises well over one hundred screens across the five portals plus the shared authentication flow. The distribution is summarised below; each portal additionally shares common components (headers, modals, skeleton loaders, bottom sheets).'));
push(TBL(['Portal', 'Screens (approx.)', 'Representative screens'],
  [
    ['Patient', '60', 'Home, Generate-Token, Token-Journey, Live-Queue, Book-Appointment, My-Prescriptions, My-Reports, Vitals-Logger, Medicine-Bank, Blood-Donor, Health-Camps, Chronic-Dashboard, Notifications, Settings, Profile'],
    ['Doctor', '24', 'Dashboard, Today-Queue, Call-Next-Patient, Consultation, Availability, Doctor-Reviews, Settings, Edit-Profile, Health-Camps'],
    ['Administrator', '13', 'Dashboard, Manage-Doctors, Manage-Pharmacists, Manage-Patients, Announcements, Ratings, Reports, Analytics, System'],
    ['Pharmacy', '≈ 20', 'Dashboard, Queue, Prescription-Details, Inventory, Requisition, Analytics, Backup, Notifications, Settings'],
    ['Laboratory', '21', 'Dashboard, Queue, Completed-Reports, Test-Catalog, Inventory, Analytics, Requisitions, Notifications, Settings'],
    ['Auth (shared)', '6', 'Welcome, Login, Signup, Forgot-Password, Force-Password-Change, Portal-Selection'],
  ], [1700, 1700, 5626]));

// ---------- Appendix E : Configuration ----------
push(H1('Appendix E — Environment and Configuration'));
push(P('The backend is configured entirely through environment variables, so no secret is committed to source control. The principal variables are listed below.'));
push(TBL(['Variable', 'Purpose'],
  [
    ['PORT', 'HTTP port (injected by the host in production).'],
    ['NODE_ENV', 'development | production (production enforces secure defaults).'],
    ['MONGO_URI', 'MongoDB Atlas connection string.'],
    ['JWT_SECRET', 'Signing secret for JWT sessions (32+ characters in production).'],
    ['JWT_EXPIRES_IN', 'Session token lifetime (default 7 days).'],
    ['SESSION_INACTIVITY_MINUTES', 'Auto-logout threshold (default 5 minutes).'],
    ['ML_AUTOSTART', 'Whether to auto-start the Python AI service (false when unavailable).'],
    ['RATE_LIMIT_MAX, BODY_LIMIT', 'Abuse-protection thresholds.'],
    ['ALLOWED_ORIGINS', 'CORS allow-list.'],
    ['EMAIL_* ', 'SMTP settings for password-reset and notification email.'],
  ], [2600, 6426]));
push(P([T('End of document.', { italics: true, color: GREY })], { align: AlignmentType.CENTER, before: 200 }));

// =================== BUILD ===================
const doc = new Document({
  creator: 'Aneeta Rasheed, Kinza Ali',
  title: 'SehatLine — Project & Thesis Documentation',
  description: 'Smart Hospital Queue Management & Chronic-Care System',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22, color: SLATE } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Calibri', size: 34, bold: true, color: HDR } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Calibri', size: 27, bold: true, color: HDR } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Calibri', size: 24, bold: true, color: SLATE } },
    ],
  },
  numbering: {
    config: [
      { reference: 'n-obj', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }] },
      { reference: 'n-fr', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: A4.width, height: A4.height }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 40 }, border: { bottom: { style: 1, size: 4, color: 'CBD5E1' } }, children: [new TextRun({ text: 'SehatLine — Project & Thesis Documentation', font: 'Calibri', size: 16, color: GREY })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', font: 'Calibri', size: 16, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 16, color: GREY })] })] }) },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('SehatLine_Documentation.docx', buf);
  console.log('WROTE SehatLine_Documentation.docx —', (buf.length / 1024).toFixed(0), 'KB,', kids.length, 'blocks');
}).catch((e) => { console.error('BUILD ERROR', e); process.exit(1); });
