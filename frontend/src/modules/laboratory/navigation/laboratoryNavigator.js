import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Drawer screens (now flat in the stack; the sidebar is a custom overlay).
import DashboardScreen from "../screens/laboratory/DashboardScreen";
import QueueScreen from "../screens/laboratory/QueueScreen";
import TestCatalogScreen from "../screens/laboratory/TestCatalogScreen";
import CompletedReportsScreen from "../screens/laboratory/CompletedReportsScreen";
import InventoryScreen from "../screens/laboratory/InventoryScreen";
import AnalyticsScreen from "../screens/laboratory/AnalyticsScreen";
import ProfileScreen from "../screens/laboratory/ProfileScreen";
import SettingsScreen from "../screens/laboratory/SettingsScreen";
import HelpSupportScreen from "../screens/laboratory/HelpSupportScreen";

// Detail / action screens.
import TestDetailsScreen from "../screens/laboratory/TestDetailsScreen";
import RequisitionsScreen from "../screens/laboratory/RequisitionsScreen";
import AddInventoryScreen from "../screens/laboratory/AddInventoryScreen";
import UpdateStockScreen from "../screens/laboratory/UpdateStockScreen";
import NotificationsScreen from "../screens/laboratory/NotificationsScreen";
import UploadReportScreen from "../screens/laboratory/UploadReportScreen";
import ReportProblemScreen from "../screens/laboratory/ReportProblemScreen";
import EditProfileScreen from "../screens/laboratory/EditProfileScreen";
import ChangePasswordScreen from "../screens/laboratory/ChangePasswordScreen";
import AboutAppScreen from "../screens/laboratory/AboutAppScreen";
import PrivacyPolicyScreen from "../screens/laboratory/PrivacyPolicyScreen";
import TermsConditionsScreen from "../screens/laboratory/TermsConditionsScreen";

const Stack = createNativeStackNavigator();

export default function LaboratoryNavigator() {
  return (
    <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Queue" component={QueueScreen} />
      <Stack.Screen name="TestCatalog" component={TestCatalogScreen} />
      <Stack.Screen name="CompletedReports" component={CompletedReportsScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />

      <Stack.Screen name="TestDetails" component={TestDetailsScreen} />
      <Stack.Screen name="AddInventory" component={AddInventoryScreen} />
      <Stack.Screen name="UpdateStock" component={UpdateStockScreen} />
      <Stack.Screen name="UploadReport" component={UploadReportScreen} />
      <Stack.Screen name="Requisitions" component={RequisitionsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="AboutApp" component={AboutAppScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
    </Stack.Navigator>
  );
}
