/* SehatLine — Final Year Project / Thesis Documentation generator.
   Authors: Aneeta Rasheed, Kinza Ali. Supervisor: Maimoona Binte Sajid.
   Produces SehatLine_Documentation.docx (comprehensive). */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, TableOfContents,
  Header, Footer, PageNumber, LevelFormat, TabStopType, TabStopPosition,
} = require('docx');

const TEAL = '0B8A7D', SLATE = '1F2937', GREY = '6B7280', LIGHT = 'E8F6F3', HDR = '0F766E';
const A4 = { width: 11906, height: 16838 };
const CONTENT_W = A4.width - 1440 * 2; // ~9026 dxa

// ---------- helpers ----------
const T = (text, o = {}) => new TextRun({ text, font: 'Calibri', size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color || SLATE, break: o.break });
const P = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { after: o.after == null ? 140 : o.after, line: 276, before: o.before || 0 },
  indent: o.indent, children: Array.isArray(text) ? text : [T(text, o)],
});
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 }, children: [new PageBreak(), new TextRun({ text, font: 'Calibri', size: 34, bold: true, color: HDR })] });
const H1np = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 120, after: 160 }, children: [new TextRun({ text, font: 'Calibri', size: 34, bold: true, color: HDR })] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 110 }, children: [new TextRun({ text, font: 'Calibri', size: 27, bold: true, color: HDR })] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 90 }, children: [new TextRun({ text, font: 'Calibri', size: 24, bold: true, color: SLATE })] });
const BUL = (items) => items.map((it) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 70, line: 268 }, children: Array.isArray(it) ? it : [T(it)] }));
const NUM = (items, ref) => items.map((it) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 70, line: 268 }, children: Array.isArray(it) ? it : [T(it)] }));
const cell = (text, w, o = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade } : undefined,
  margins: { top: 40, bottom: 40, left: 90, right: 90 },
  children: [new Paragraph({ alignment: o.align || AlignmentType.LEFT, spacing: { after: 0, line: 250 }, children: [new TextRun({ text: String(text), font: 'Calibri', size: o.size || 18, bold: o.bold, color: o.color || SLATE })] })],
});
function TBL(headers, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const head = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { shade: HDR, color: 'FFFFFF', bold: true, align: i === 0 ? AlignmentType.LEFT : AlignmentType.LEFT })) });
  const body = rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], { shade: ri % 2 ? 'F3FAF8' : 'FFFFFF' })) }));
  return new Table({ columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, borders, rows: [head, ...body] });
}
const SP = (h = 60) => new Paragraph({ spacing: { after: h }, children: [T('')] });

// ================= content =================
const kids = [];
const push = (...x) => x.forEach((e) => kids.push(e));

// ---- Title page ----
push(
  new Paragraph({ spacing: { before: 900, after: 0 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SEHATLINE', font: 'Calibri', size: 72, bold: true, color: HDR })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'A Smart Hospital Queue Management & Chronic-Care System', font: 'Calibri', size: 30, bold: true, color: SLATE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'Capital Hospital, Capital Development Authority (CDA) — G-6/2, Islamabad', font: 'Calibri', size: 22, italics: true, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Project & Thesis Documentation', font: 'Calibri', size: 28, bold: true, color: HDR })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'Mobile Application (Android / iOS) with Node.js Backend, MongoDB, and an AI Triage Service', font: 'Calibri', size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Designed & Developed by', font: 'Calibri', size: 22, color: SLATE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new TextRun({ text: 'Aneeta Rasheed', font: 'Calibri', size: 26, bold: true, color: HDR })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Kinza Ali', font: 'Calibri', size: 26, bold: true, color: HDR })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Supervised by', font: 'Calibri', size: 22, color: SLATE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'Maimoona Binte Sajid', font: 'Calibri', size: 26, bold: true, color: HDR })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: 'Application Version 5.3.0  ·  Backend Version 2.1.0', font: 'Calibri', size: 20, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Session 2025 – 2026', font: 'Calibri', size: 20, color: GREY })] }),
);

// ---- Certificate ----
push(H1('Certificate of Approval'));
push(P('This is to certify that the project and thesis titled "SehatLine — A Smart Hospital Queue Management & Chronic-Care System" has been carried out and completed by Aneeta Rasheed and Kinza Ali under the supervision of Maimoona Binte Sajid, in partial fulfilment of the requirements for the award of the degree. The work presented in this document is the result of the authors’ own effort and, to the best of our knowledge, has not been submitted elsewhere.'));
push(SP(240));
push(P([T('__________________________', {})], { align: AlignmentType.LEFT, after: 20 }));
push(P([T('Maimoona Binte Sajid', { bold: true })], { align: AlignmentType.LEFT, after: 0 }));
push(P([T('Project Supervisor', { color: GREY })], { align: AlignmentType.LEFT, after: 300 }));
push(P([T('__________________________     __________________________', {})], { align: AlignmentType.LEFT, after: 20 }));
push(P([T('Aneeta Rasheed                              Kinza Ali', { bold: true })], { align: AlignmentType.LEFT, after: 0 }));
push(P([T('Project Authors', { color: GREY })], { align: AlignmentType.LEFT }));

// ---- Acknowledgements ----
push(H1('Acknowledgements'));
push(P('We are deeply grateful to our supervisor, Maimoona Binte Sajid, whose guidance, encouragement and constructive feedback shaped this project at every stage. We thank the administration and clinical staff of Capital Hospital (CDA), Islamabad, whose real-world queue and chronic-care challenges inspired and grounded this work. Finally, we thank our families and peers for their unwavering support throughout the development of SehatLine.'));

// ---- Abstract ----
push(H1('Abstract'));
push(P('Overcrowded outpatient departments (OPD), long physical waiting lines, and fragmented chronic-care follow-ups are among the most persistent problems in public hospitals. Patients frequently arrive early and wait for hours in crowded halls, while a small, fixed number of doctors work through the day at a steady pace. SehatLine addresses this problem not by demanding more doctors — an option rarely available in the public sector — but by removing the physical rush through intelligent, staggered digital tokens, a real-time live queue, and an AI-assisted triage that ensures the sickest and most vulnerable patients are seen first.'));
push(P('SehatLine is a cross-platform mobile application (Android and iOS, built with React Native / Expo) backed by a Node.js and Express REST API, a MongoDB (Atlas) database, a real-time Socket.IO layer, and a dedicated Python AI micro-service for patient prioritisation. The system is organised into five role-based portals — Patient, Doctor, Administrator, Pharmacy and Laboratory — that together digitise the complete patient journey: booking and token generation, doctor consultation, pharmacy dispensing, and laboratory testing, with prescriptions, lab reports and notifications flowing automatically between them.'));
push(P('The analytical heart of the system is a queue-management engine grounded in classical queueing theory: an M/M/s (Erlang C) model for departmental performance, a Cobham non-preemptive priority approximation for triage classes, and a Lag-SIPP method for staffing recommendations. A discrete-event priority simulation validates these models against realistic OPD loads. The results are compelling: with the same fixed staff (4 Chronic-OPD doctors, 6 Cardiology doctors) over a five-hour session, the peak physical crowd is reduced by approximately 91–97% at realistic daily loads (100–300 patients) and remains reduced by 75–76% even under heavy overload (400 patients). Patient prioritisation is driven by an ensemble machine-learning model (Gradient Boosting + a neural-network multi-layer perceptron), with a deterministic rule-based fallback, operating over fourteen clinical features. The system further incorporates on-device biometric login, OCR-based CNIC verification, and a hardened, validated backend exposing 183 REST endpoints across 26 data models.'));
push(P('This document presents the complete engineering account of SehatLine: its motivation, methodology, architecture, database and API design, security posture, artificial-intelligence and queueing algorithms, a comprehensive 17-category testing plan, deployment strategy, and measured results.'));
push(P([T('Keywords: ', { bold: true }), T('hospital queue management, queueing theory, Erlang C, priority triage, machine learning ensemble, chronic care, React Native, Node.js, MongoDB, Socket.IO, OCR, mobile health (mHealth).', { italics: true })]));

// ---- TOC ----
push(H1('Table of Contents'));
push(new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }));

// ===================================================================
// CHAPTER 1
push(H1('Chapter 1 — Introduction'));
push(H2('1.1 Background'));
push(P('Public-sector hospitals in Pakistan serve enormous patient volumes with limited human resources. A typical outpatient department may register several hundred patients in a single morning session, all of whom are attended by a handful of doctors. Because there is no reliable way for a patient to know when their turn will come, the rational strategy is to arrive as early as possible and wait. The predictable consequence is a large physical crowd that forms at opening time and only slowly dissipates over the session. This crowding is more than an inconvenience: it creates infection-control risks, distress for elderly and critically ill patients, disputes over turn order, and a working environment in which clinical staff are under constant pressure.'));
push(P('At the same time, patients with chronic conditions — diabetes, hypertension, cardiac and renal disease — require regular, structured follow-up. In the absence of a digital record of their condition, medication schedule and previous visits, these patients are treated as anonymous members of the same undifferentiated queue as everyone else, and their continuity of care suffers.'));
push(H2('1.2 Problem Statement'));
push(P('The core problem SehatLine addresses can be stated precisely: given a fixed, small number of doctors, how can a hospital eliminate the physical waiting crowd, guarantee that the most urgent and vulnerable patients are prioritised, and provide continuous, digitised chronic care — without increasing staff? The traditional answer, hiring more doctors, is usually infeasible. SehatLine’s answer is a coordinated digital system that reschedules when patients physically arrive (through staggered, time-estimated tokens), makes the queue transparent and live, triages patients intelligently, and connects the OPD to the pharmacy and laboratory in a single continuous flow.'));
push(H2('1.3 Objectives'));
push(...NUM([
  'To design and implement a cross-platform mobile application that digitises the complete outpatient journey — booking, tokening, consultation, pharmacy and laboratory — for patients and staff alike.',
  'To eliminate the physical waiting crowd by issuing staggered digital tokens with estimated service times, backed by a live, real-time queue view.',
  'To prioritise patients intelligently using an AI-assisted triage model that accounts for age, chronic conditions, vital signs and other clinical features.',
  'To provide structured, persistent chronic-care records, medication reminders, laboratory reports and a blood-donor network.',
  'To secure the system with strong authentication, biometric login, identity (CNIC) verification, session management and input validation.',
  'To evaluate the queue-reduction benefit quantitatively using queueing theory and discrete-event simulation.',
], 'n-obj'));
push(H2('1.4 Scope'));
push(P('SehatLine covers five integrated role-based portals (Patient, Doctor, Administrator, Pharmacy, Laboratory), a complete REST backend, a real-time layer, an AI triage micro-service, and a queue-analytics engine. The application targets Android and iOS phones. The project delivers a working, deployable system with a seeded demonstration database, and an evaluation of its queue-management benefit. Hospital-wide hardware integration (e.g., physical token-printer kiosks or biometric turnstiles) is outside the current scope but is discussed in Future Work.'));
push(H2('1.5 Significance'));
push(P('By reducing the physical rush by roughly 90% at realistic loads without additional staff, SehatLine offers a low-cost, high-impact intervention for exactly the resource-constrained settings that need it most. Its chronic-care and triage features additionally improve clinical outcomes for the most vulnerable patients. The design is general: although built around Capital Hospital, the system applies to any OPD-based facility.'));
push(H2('1.6 Document Organisation'));
push(P('The remainder of this document is organised as follows. Chapter 2 reviews related work in hospital queue systems, queueing theory and triage. Chapter 3 presents the requirement analysis. Chapter 4 describes the Agile development methodology, phases and versions. Chapter 5 gives the system architecture and technology stack. Chapter 6 details the database design. Chapter 7 describes each of the five modules. Chapter 8 documents all backend APIs and where they are used. Chapter 9 covers backend features and security. Chapter 10 presents the AI and queueing algorithms. Chapter 11 reports the queue-optimisation results and metrics. Chapter 12 gives the full testing plan across seventeen categories. Chapter 13 covers deployment. Chapter 14 evaluates results, and Chapter 15 concludes with future work.'));

// CHAPTER 2 — Literature Review
push(H1('Chapter 2 — Literature Review'));
push(H2('2.1 Hospital Queue Management Systems'));
push(P('Digital queue-management systems have been widely studied as a means of reducing perceived and actual waiting time. Token- and appointment-based systems replace physical lines with a logical ordering, and when combined with estimated waiting times they reduce the incentive for patients to arrive early. SehatLine builds on this idea but extends it with a live, socket-driven queue and with clinical prioritisation, rather than pure first-come-first-served ordering.'));
push(H2('2.2 Queueing Theory in Healthcare'));
push(P('Queueing theory provides the mathematical foundation for analysing service systems with random arrivals and service times. The M/M/s model — Markovian (memoryless) arrivals and service, with s parallel servers — is the standard model for a multi-doctor OPD. Its central result, the Erlang C formula, gives the probability that an arriving patient must wait for service, from which the average queue length (Lq), average waiting time (Wq) and system occupancy follow. For systems with priority classes, Cobham’s formula gives the expected waiting time of each non-preemptive priority class. These classical results, described in any standard operations-research text, are implemented directly in SehatLine’s queue engine (Chapter 10).'));
push(H2('2.3 Staffing and the SIPP Approach'));
push(P('The Stationary-Independent-Period-by-Period (SIPP) approach divides a day into periods, treats each as an independent stationary queue, and computes the minimum number of servers needed per period to meet a waiting-time target. Because demand and staffing are not perfectly synchronised, a "lag" refinement shifts each period’s requirement forward so that staffing covers the load that has just arrived. SehatLine implements a Lag-SIPP staffing recommender to advise, when overload occurs, the smallest number of additional doctors (or extended hours) needed to hold a target wait.'));
push(H2('2.4 Machine Learning for Triage'));
push(P('Clinical triage prioritises patients by urgency. Rule-based triage (e.g., emergency severity indices) is transparent but rigid; machine-learning models can interpolate smoothly between cases and combine many features. Ensemble methods — combining several base learners — typically outperform any single model on tabular clinical data. SehatLine adopts an ensemble of a Gradient Boosting Regressor and a neural-network (multi-layer perceptron) regressor, averaged at inference, with a deterministic rule-based function serving both as training ground-truth and as a zero-dependency fallback.'));
push(H2('2.5 Optical Character Recognition for Identity Verification'));
push(P('OCR converts images of documents into machine-readable text. For patient onboarding, SehatLine uses OCR to read the national identity (CNIC) card during sign-up, extracting the card number and name to pre-fill and verify the patient’s identity, reducing manual data-entry errors.'));

// CHAPTER 3 — Requirements
push(H1('Chapter 3 — Requirement Analysis'));
push(H2('3.1 Stakeholders and User Roles'));
push(...BUL([
  [T('Patient: ', { bold: true }), T('books/generates tokens, tracks the live queue, receives prescriptions, lab reports, medication reminders, and can join the blood-donor network.')],
  [T('Doctor: ', { bold: true }), T('views the queue, calls the next patient, records diagnosis, prescribes medicines and lab tests, sets availability, and reviews patient feedback.')],
  [T('Administrator: ', { bold: true }), T('manages doctors and pharmacists, classifies chronic patients, publishes announcements, reviews ratings and problem reports, and monitors system analytics.')],
  [T('Pharmacist: ', { bold: true }), T('receives prescriptions, prepares and dispenses medicines, manages inventory and requisitions, and forwards test-carrying patients to the laboratory.')],
  [T('Laboratory Staff: ', { bold: true }), T('manages the sample queue, records results, issues lab reports to patients, and manages the test catalogue and consumables.')],
]));
push(H2('3.2 Functional Requirements'));
push(...NUM([
  'The system shall allow patients to register with CNIC-based identity verification and biometric login.',
  'The system shall issue staggered digital tokens with an estimated service time and department.',
  'The system shall display a live, real-time queue that updates as patients are served.',
  'The system shall prioritise patients by clinical urgency using an AI triage service with a rule-based fallback.',
  'The system shall route a patient from consultation to pharmacy, and (when tests are prescribed) onward to the laboratory, automatically.',
  'The system shall maintain chronic-care records, medication reminders, vitals logging and laboratory reports.',
  'The system shall provide role-based dashboards and analytics for doctors, administrators, pharmacists and laboratory staff.',
  'The system shall deliver notifications (announcements, order/lab status, reminders) to the correct users.',
], 'n-fr'));
push(H2('3.3 Non-Functional Requirements'));
push(...BUL([
  [T('Security: ', { bold: true }), T('encrypted passwords, JWT sessions with inactivity timeout, device-fingerprint binding, input validation, rate limiting and secure HTTP headers.')],
  [T('Performance: ', { bold: true }), T('sub-second API responses under normal load; the backend was load-tested (see Chapters 11 and 12).')],
  [T('Reliability: ', { bold: true }), T('graceful degradation — the AI service and real-time layer are optional; the system remains functional (rule-based prioritisation, manual refresh) if they are unavailable.')],
  [T('Usability: ', { bold: true }), T('a consistent, theme-aware (light/dark) interface, left-aligned screen headers, biometric convenience and clear status feedback.')],
  [T('Portability: ', { bold: true }), T('a single React Native codebase runs on both Android and iOS.')],
  [T('Maintainability: ', { bold: true }), T('a modular, per-role backend architecture with centralised configuration and validation.')],
]));

// CHAPTER 4 — Methodology
push(H1('Chapter 4 — Development Methodology'));
push(H2('4.1 Agile / Iterative Approach'));
push(P('SehatLine was developed using an Agile, iterative methodology. Rather than attempting a single monolithic delivery, the system was built module-by-module in short iterations (sprints), each producing a working, testable increment. This approach suited a project whose requirements — drawn from a real hospital setting — were refined continuously as each portal was demonstrated and reviewed with the supervisor. Each sprint followed the familiar cycle of planning, design, implementation, testing, and review, with feedback from one sprint feeding directly into the next.'));
push(H2('4.2 Why Agile Was Chosen'));
push(...BUL([
  'Evolving requirements: the exact behaviour of the queue, triage and inter-department flow was discovered and refined through iteration, which a rigid Waterfall plan could not accommodate.',
  'Continuous demonstrability: each portal (Patient, then Doctor, Admin, Pharmacy, Laboratory) was delivered as a working slice, allowing early and frequent feedback.',
  'Risk reduction: integrating the modules incrementally (e.g., doctor → pharmacy → laboratory token flow) surfaced integration issues early rather than at the end.',
  'Parallel work: a two-person team could own and iterate on different modules simultaneously and merge frequently through version control.',
]));
push(H2('4.3 Development Phases'));
push(TBL(
  ['Phase', 'Focus', 'Key Deliverables'],
  [
    ['1. Foundation', 'Backend skeleton, auth, database', 'Express app, MongoDB models, JWT auth, sessions, seed data'],
    ['2. Patient Core', 'Patient portal & token flow', 'Registration, CNIC OCR, token generation, live queue, notifications'],
    ['3. Doctor Module', 'Consultation workflow', 'Queue, call-next, diagnosis, prescriptions, availability, reviews'],
    ['4. Admin Module', 'Governance & analytics', 'Doctor/pharmacist CRUD, chronic classification, reports, announcements'],
    ['5. Pharmacy Module', 'Dispensing workflow', 'Prescription queue, inventory, dispensing, requisitions, backups'],
    ['6. Laboratory Module', 'Testing workflow', 'Sample queue, results, lab reports, test catalogue, inventory'],
    ['7. Intelligence', 'AI triage & queue engine', 'ML ensemble service, M/M/s + priority + Lag-SIPP engine, load tests'],
    ['8. Hardening', 'Security, theme, UX', 'Validation, rate-limit, biometric, dark mode, header/alignment polish'],
    ['9. Deployment', 'Release', 'MongoDB Atlas, backend hosting, Android APK build, documentation'],
  ],
  [1900, 2600, 4526],
));
push(H2('4.4 Versioning and Tools'));
push(P('The project uses semantic versioning. At the time of writing, the mobile application is at version 5.3.0 and the backend at version 2.1.0; these numbers reflect a long series of incremental releases across the phases above. Development tooling included Git and GitHub for version control and collaboration, the Expo tool-chain and EAS Build for producing the mobile application, Node.js and npm for the backend, and MongoDB Atlas for the cloud database. Real-time behaviour was developed against Socket.IO, and the AI service against Python with scikit-learn and PyTorch.'));

// CHAPTER 5 — Architecture
push(H1('Chapter 5 — System Architecture'));
push(H2('5.1 High-Level Architecture'));
push(P('SehatLine follows a classic multi-tier, client–server architecture with a dedicated intelligence tier. The presentation tier is the React Native mobile application. The application tier is a Node.js / Express REST API organised into per-role modules, augmented by a Socket.IO server for real-time updates and a Python FastAPI micro-service for AI triage. The data tier is MongoDB (Atlas). The tiers communicate over HTTPS (REST/JSON) and WebSockets (Socket.IO), while the backend calls the AI service over an internal HTTP channel.'));
push(P([T('Request flow (typical): ', { bold: true }), T('Mobile App  →  HTTPS/JSON  →  Express API (auth → validation → controller → Mongoose model → MongoDB Atlas)  →  JSON response. Live updates: Backend  →  Socket.IO event  →  subscribed apps. Triage: Backend  →  HTTP  →  Python AI service  →  urgency score.')]));
push(H2('5.2 Backend Modular Structure'));
push(P('The backend is decomposed into independent, per-role modules — auth, patient, doctor, admin, pharmacy and laboratory — each with its own routes, controllers, services and models. Cross-cutting concerns (configuration, security middleware, validation, logging, the queue engine and the AI client) live in shared locations. This separation keeps each portal’s logic cohesive and independently testable, and directly supported the phase-by-phase Agile delivery.'));
push(H2('5.3 Technology Stack'));
push(TBL(
  ['Layer', 'Technology', 'Role in SehatLine'],
  [
    ['Mobile UI', 'React Native (Expo SDK 54)', 'Cross-platform Android/iOS application'],
    ['Navigation', 'React Navigation (native-stack, drawer)', 'Screen and portal navigation'],
    ['Animation', 'React Native Reanimated', 'Splash / welcome animation, transitions'],
    ['Device APIs', 'expo-camera, expo-image-picker, expo-local-authentication, expo-notifications', 'CNIC capture, biometric login, push notifications'],
    ['Backend', 'Node.js 20 + Express 4', 'REST API (183 endpoints)'],
    ['Database', 'MongoDB (Mongoose 8) on Atlas', 'Document data store (26 models)'],
    ['Real-time', 'Socket.IO 4', 'Live queue and dashboard updates'],
    ['AI service', 'Python + FastAPI + scikit-learn + PyTorch', 'Patient triage (ensemble ML)'],
    ['OCR', 'tesseract.js + jimp', 'CNIC identity verification'],
    ['Auth', 'JSON Web Tokens (JWT) + bcryptjs', 'Stateless sessions, hashed passwords'],
    ['Security', 'helmet, cors, express-rate-limit, zod', 'Headers, CORS, throttling, validation'],
    ['Scheduling', 'node-cron', 'Automated daily database backups'],
    ['Reporting', 'exceljs, pdfkit', 'Excel exports, PDF reports'],
  ],
  [1700, 3100, 4226],
));

// CHAPTER 6 — Database
push(H1('Chapter 6 — Database Design'));
push(H2('6.1 Overview'));
push(P('SehatLine uses MongoDB, a document-oriented database, accessed through the Mongoose object-data-modelling (ODM) library. The schema comprises 26 models. Documents are related by ObjectId references (e.g., a Prescription references a User and a Token), and Mongoose schema validation enforces required fields, enumerations and defaults at the data layer, complementing the request-level validation described in Chapter 9.'));
push(H2('6.2 Core Data Models'));
push(TBL(
  ['Model', 'Purpose / Key Fields'],
  [
    ['User', 'All accounts (patient/doctor/admin/pharmacy/laboratory); credentials, role, CNIC/CDA card, chronic flags, biometric & notification settings, device fingerprint.'],
    ['Session', 'Active login sessions; supports inactivity timeout and device binding.'],
    ['PasswordReset', 'One-time codes and state for the forgot-password flow.'],
    ['Token', 'The OPD queue token; department, status, priority, estimated time, journey log.'],
    ['Counter', 'Atomic sequence generator for human-readable token numbers.'],
    ['Appointment', 'Cardiology appointment bookings (date, time, doctor, status).'],
    ['Doctor', 'Doctor profile records (specialisation, department, availability).'],
    ['Prescription', 'Doctor-issued prescription; medicines, structured dosing, tests, pharmacy & lab status, links to Token and LabReport.'],
    ['Medicine / Order', 'Pharmacy catalogue and patient medicine orders.'],
    ['LabTest / LabInventory / LabRequisition', 'Laboratory catalogue, consumables, and stock requisitions.'],
    ['LabReport', 'Completed laboratory report delivered to the patient (results, analysis, PDF).'],
    ['Vital', 'Patient-logged vital signs (BP, sugar, SpO2, etc.) with analysis.'],
    ['Notification', 'In-app notifications across all roles.'],
    ['DoctorFeedback / Feedback', 'Patient reviews of doctors and general feedback.'],
    ['BloodRequest', 'Blood-donor network requests and responses.'],
    ['HealthCamp', 'Health-camp listings and registrations.'],
    ['Announcement', 'Administrator announcements broadcast to users.'],
    ['MedReminderLog', 'Medication-reminder adherence log.'],
    ['Requisition', 'Pharmacy stock requisitions to the administrator.'],
  ],
  [2400, 6626],
));
push(H2('6.3 Referential Design and Integrity'));
push(P('The most important relationships flow along the patient journey. A Token belongs to a User and carries the department and status; when a doctor completes a consultation a Prescription is created that references both the Token and the User and records the prescribed medicines and tests. The pharmacy updates the Prescription’s dispensing status; if tests are present, the same Prescription becomes visible to the laboratory, which on completion creates a LabReport referencing the patient. This single-thread-of-truth design keeps the four stages — consultation, pharmacy, laboratory, report — consistent without duplicating patient data.'));

// CHAPTER 7 — Modules
push(H1('Chapter 7 — Module Design and Features'));
push(H2('7.1 Patient Portal'));
push(P('The patient portal is the primary consumer-facing surface. After a verified registration (including CNIC OCR and optional biometric enrolment), a patient can generate a staggered token, watch the live queue advance in real time, and follow their journey through consultation, pharmacy and laboratory. Additional patient features include chronic-care dashboards, medication reminders, vitals logging with analysis, laboratory reports, a medicine bank/ordering flow, health-camp registration, a blood-donor network, announcements and a full notification centre. The interface is theme-aware (light and dark) and the screens share a consistent, left-aligned header design that blends into each screen’s background.'));
push(H2('7.2 Doctor Portal'));
push(P('The doctor portal drives the consultation workflow. A doctor sees their live queue, calls the next patient, and records the consultation: diagnosis, clinical notes, structured medicine orders (with per-day timing and duration), and laboratory tests. On completion the patient is advanced automatically to the pharmacy. Doctors also configure their working hours and working days (so patients can only book on available dates), review patient feedback in a carousel, and manage health camps. The portal lives inside its own drawer (sidebar) navigator.'));
push(H2('7.3 Administrator Portal'));
push(P('The administrator portal provides governance and oversight. Administrators perform full create/read/update/delete management of doctors and pharmacists (including bulk and Excel import), classify patients as chronic (which gates the chronic-OPD flow), publish announcements, review star ratings and user-submitted problem reports (with the ability to reply), fulfil pharmacy/laboratory requisitions, and monitor system analytics and metrics.'));
push(H2('7.4 Pharmacy Portal'));
push(P('The pharmacy portal receives prescriptions the moment a doctor completes a consultation. Pharmacists prepare, mark ready and dispense medicines; dispensing decrements structured stock quantities and raises low-/out-of-stock notifications. The portal manages inventory, loan prescriptions, requisitions and automated backups. Crucially, when a dispensed prescription carries laboratory tests, the patient is routed onward into the laboratory queue automatically — for both chronic-OPD tokens and cardiology appointments.'));
push(H2('7.5 Laboratory Portal'));
push(P('The laboratory portal manages the testing stage. Test-carrying patients appear in the lab queue after pharmacy dispensing. Laboratory staff collect the sample, mark it processing, and complete it with results; completion generates a LabReport that is immediately visible to the patient with plain-language analysis, and finishes the patient’s token journey. The portal also manages the test catalogue, consumable inventory, requisitions, and can issue a report to any patient by card number. It supports notification filters and a mark-all-read action, mirroring the pharmacy portal.'));

fs.writeFileSync('__part1_done.txt', 'ok');
module.exports = { kids, H1, H1np, H2, H3, P, T, BUL, NUM, TBL, SP, push, TEAL, SLATE, GREY, HDR, A4,
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Header, Footer, PageNumber, LevelFormat, TableOfContents };
