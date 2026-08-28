// Doctor navigation — the sidebar/drawer has been REMOVED. All doctor screens
// now live in a plain stack. Screen names are unchanged so every existing
// navigation.navigate('X') call keeps working. The former sidebar links now
// live as a "Menu" section on the Doctor Profile screen.

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DoctorPortalScreen from '../screens/DoctorPortalScreen';
import TodayQueueScreen from '../screens/TodayQueueScreen';
import ConsultationScreen from '../screens/ConsultationScreen';
import PatientHistoryScreen from '../screens/PatientHistoryScreen';
import TodayHistoryScreen from '../screens/TodayHistoryScreen';
import PrescriptionScreen from '../screens/PrescriptionScreen';
import PrescriptionTemplatesScreen from '../screens/PrescriptionTemplatesScreen';
import DoctorScheduleScreen from '../screens/DoctorScheduleScreen';
import CallNextPatientScreen from '../screens/CallNextPatientScreen';
import DoctorProfileScreen from '../screens/DoctorProfileScreen';
import DoctorEditProfileScreen from '../screens/DoctorEditProfileScreen';
import DoctorNotificationsScreen from '../screens/DoctorNotificationsScreen';
import AdminNotificationsScreen from '../screens/AdminNotificationsScreen';
import DoctorSettingsScreen from '../screens/DoctorSettingsScreen';
import DoctorReviewsScreen from '../screens/DoctorReviewsScreen';
import DoctorAvailabilityScreen from '../screens/DoctorAvailabilityScreen';
import HelpSupportScreen from '../../patient/screens/HelpSupportScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import RealTimeQueueScreen from '../screens/RealTimeQueueScreen';
import DoctorDetailScreen from '../screens/DoctorDetailScreen';
import DoctorListScreen from '../screens/DoctorListScreen';
import DoctorPrivacyScreen from '../screens/DoctorPrivacyScreen';
import DoctorTermsScreen from '../screens/DoctorTermsScreen';
import DoctorReportScreen from '../screens/DoctorReportScreen';
import DoctorCampsScreen from '../screens/DoctorCampsScreen';

const Stack = createNativeStackNavigator();

// NOTE: kept the export name so RootNavigator's import doesn't change.
export default function DoctorDrawerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="DoctorHome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F4F7FC' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DoctorHome" component={DoctorPortalScreen} />
      <Stack.Screen name="TodayQueue" component={TodayQueueScreen} />
      <Stack.Screen name="Consultation" component={ConsultationScreen} />
      <Stack.Screen name="CallNextPatientScreen" component={CallNextPatientScreen} />
      <Stack.Screen name="PatientHistory" component={PatientHistoryScreen} />
      <Stack.Screen name="TodayHistory" component={TodayHistoryScreen} />
      <Stack.Screen name="Prescription" component={PrescriptionScreen} />
      <Stack.Screen name="PrescriptionTemplates" component={PrescriptionTemplatesScreen} />
      <Stack.Screen name="DoctorSchedule" component={DoctorScheduleScreen} />
      <Stack.Screen name="DoctorAvailability" component={DoctorAvailabilityScreen} />
      <Stack.Screen name="RealTimeQueue" component={RealTimeQueueScreen} />
      <Stack.Screen name="DoctorReviews" component={DoctorReviewsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
      <Stack.Screen name="DoctorEditProfileScreen" component={DoctorEditProfileScreen} />
      <Stack.Screen name="DoctorSettings" component={DoctorSettingsScreen} />
      <Stack.Screen name="DoctorNotifications" component={DoctorNotificationsScreen} />
      <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
      <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
      <Stack.Screen name="DoctorDetail" component={DoctorDetailScreen} />
      <Stack.Screen name="DoctorList" component={DoctorListScreen} />
      <Stack.Screen name="DoctorPrivacy" component={DoctorPrivacyScreen} />
      <Stack.Screen name="DoctorTerms" component={DoctorTermsScreen} />
      <Stack.Screen name="DoctorReport" component={DoctorReportScreen} />
      <Stack.Screen name="DoctorCamps" component={DoctorCampsScreen} />
    </Stack.Navigator>
  );
}
