// Patient navigator — registers all patient module screens.
// HomeScreen is the landing screen after a patient logs in / signs up.

// ---- Real screens that exist ----
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AboutHospitalScreen from '../screens/AboutHospitalScreen';
import ContactScreen from '../screens/ContactScreen';
import HospitalTimingsScreen from '../screens/HospitalTimingsScreen';
import ChronicDashboardScreen from '../screens/ChronicDashboardScreen';

// Appointments
import AppointmentListScreen from '../screens/AppointmentListScreen';
import AppointmentDetailScreen from '../screens/AppointmentDetailScreen';
import BookAppointmentScreen from '../screens/BookAppointmentScreen';
import RescheduleScreen from '../screens/RescheduleScreen';

// Tokens / queue
import GenerateTokenScreen from '../screens/GenerateTokenScreen';
import ChronicOPDScreen from '../screens/ChronicOPDScreen';
import TokenJourneyScreen from '../screens/TokenJourneyScreen';
import AppointmentTrackScreen from '../screens/AppointmentTrackScreen';
import LiveTokenQueueScreen from '../screens/LiveTokenQueueScreen';

// Pharmacy / meds
import MedicineListScreen from '../screens/MedicineListScreen';
import CartScreen from '../screens/CartScreen';
import MedsReminderConfig from '../screens/MedsReminderConfig';
import DietPrecautionScreen from '../screens/DietPrecautionScreen';
import MyPrescriptionsScreen from '../screens/MyPrescriptionsScreen';
import PrescriptionDetailScreen from '../screens/PrescriptionDetailScreen';

// Newly added screens
import ReportsListScreen from '../screens/ReportsListScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import UploadReportScreen from '../screens/UploadReportScreen';
import DoctorListScreen from '../screens/DoctorListScreen';
import DoctorAvailabilityScreen from '../screens/DoctorAvailabilityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import PoliciesScreen from '../screens/PoliciesScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import AccountOwnershipScreen from '../screens/AccountOwnershipScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import VitalsLoggerScreen from '../screens/VitalsLoggerScreen';
import LiveQueueScreen from '../screens/LiveQueueScreen';
import PharmacyScreen from '../screens/PharmacyScreen';
import LaboratoryScreen from '../screens/LaboratoryScreen';
import BloodDonorScreen from '../screens/BloodDonorScreen';
import HealthCampsScreen from '../screens/HealthCampsScreen';

// ---- Placeholder for screens not built yet ----

// Map of screen name → component. Every entry is a real, working screen —
// there are no placeholders. A route that opens "Coming soon" is a promise
// the app cannot keep, so features either ship or are not offered.
export const patientScreens = {
  HomeScreen,
  ProfileScreen,
  NotificationsScreen,
  AboutHospitalScreen,
  ContactScreen,
  HospitalTimingsScreen,
  ChronicDashboardScreen,

  AppointmentListScreen,
  AppointmentDetailScreen,
  BookAppointmentScreen,
  RescheduleScreen,

  GenerateTokenScreen,
  ChronicOPDScreen,
  TokenJourneyScreen,
  AppointmentTrackScreen,
  LiveTokenQueueScreen,

  MedicineListScreen,
  CartScreen,
  MedsReminderConfig,
  DietPrecautionScreen,
  MyPrescriptionsScreen,
  PrescriptionDetailScreen,

  // Newly added real screens
  ReportsListScreen,
  ReportDetailScreen,
  UploadReportScreen,
  DoctorListScreen,
  DoctorAvailabilityScreen,
  SettingsScreen,
  HelpSupportScreen,
  PoliciesScreen,
  PrivacyScreen,
  AccountOwnershipScreen,
  FeedbackScreen,
  VitalsLoggerScreen,
  LiveQueueScreen,
  PharmacyScreen,
  LaboratoryScreen,
  BloodDonorScreen,
  HealthCampsScreen,
  HealthMetricsScreen: VitalsLoggerScreen, // vitals logger doubles as health metrics

  // ---- Aliases (some screens navigate using these names) ----
  HospitalHome: HomeScreen,
  Appointments: AppointmentListScreen,
  AppointmentList: AppointmentListScreen,
  AppointmentsScreen: AppointmentListScreen, // notifications use this name
  MyPrescriptions: MyPrescriptionsScreen,
  PrescriptionDetail: PrescriptionDetailScreen,

  RealTimeQueueScreen: LiveQueueScreen,
};

