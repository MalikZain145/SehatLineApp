// Root navigator.
// Auth flow (Welcome → Login/Signup/Forgot) then role landing screens.
// Patients land on HomeScreen with the full patient module registered.
// Other roles still use placeholders until their modules are built.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../modules/auth/screens/WelcomeScreen';
import LoginScreen from '../modules/auth/screens/LoginScreen';
import SignupScreen from '../modules/auth/screens/SignupScreen';
import ForgotPasswordScreen from '../modules/auth/screens/ForgotPasswordScreen';
import ForcePasswordChangeScreen from '../modules/auth/screens/ForcePasswordChangeScreen';
import PortalSelectionScreen from '../modules/auth/screens/PortalSelectionScreen';

import { patientScreens } from '../modules/patient/navigation/patientScreens';

// Doctor module — the whole doctor portal now lives inside its own Drawer
// (sidebar) navigator, which registers every doctor screen internally.
import DoctorDrawerNavigator from '../modules/doctor/navigation/DoctorDrawerNavigator';
import AdminNavigator from '../modules/admin/navigation/AdminNavigator';
import PharmacyNavigator from '../modules/pharmacy/navigation/PharmacyNavigator';
import LaboratoryPortal from '../modules/laboratory/LaboratoryPortal';

import { useSession } from '../context/SessionContext';
import { COLORS } from '../theme';

const Stack = createNativeStackNavigator();

// ---- Temporary role landing screens for non-patient roles ----
function Placeholder({ title }) {
  const { logout } = useSession();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout('manual');
  };

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>This portal is under construction.</Text>
      <TouchableOpacity
        style={[styles.btn, loggingOut && { opacity: 0.6 }]}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>{loggingOut ? 'Logging out…' : 'Log Out'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        // Solid screen background so no black card shows through at the edges
        // or during the transition (Android native-stack defaults dark).
        contentStyle: { backgroundColor: COLORS.background },
        // Screens rise up from the bottom and fade in. `fade_from_bottom`
        // (not `slide_from_bottom`) is used deliberately: the plain slide renders
        // each screen as a native card that casts a dark drop-shadow along its
        // top edge as it moves — `fade_from_bottom` gives the same premium
        // bottom-to-top entrance with NO black shadow.
        animation: 'fade_from_bottom',
        animationDuration: 300,
      }}
    >
      {/* Auth — Welcome is the home base, so it fades rather than sliding up. */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="PortalSelection" component={PortalSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChangeScreen} options={{ gestureEnabled: false }} />

      {/* Patient module — all screens (HomeScreen is the landing screen) */}
      {Object.entries(patientScreens).map(([name, component]) => (
        <Stack.Screen key={name} name={name} component={component} />
      ))}

      {/* Doctor module — one entry: the Drawer/sidebar navigator holds every
          doctor screen (Dashboard, Queue, Consultation, Profile, etc.). */}
      <Stack.Screen name="DoctorPortal" component={DoctorDrawerNavigator} />
      <Stack.Screen name="DoctorHome" component={DoctorDrawerNavigator} />

      {/* Other role portals (placeholders until built) */}
      <Stack.Screen name="AdminPortal" component={AdminNavigator} />
      <Stack.Screen name="AdminHome" component={AdminNavigator} />
      <Stack.Screen name="LaboratoryPortal" component={LaboratoryPortal} />
      <Stack.Screen name="PharmacyPortal" component={PharmacyNavigator} />
      <Stack.Screen name="PharmacyHome" component={PharmacyNavigator} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  sub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  btn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: COLORS.white, fontWeight: '700' },
});
