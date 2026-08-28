// LaboratoryPortal — the entry the RootNavigator mounts for role 'laboratory'.
// Composes the lab module's own Theme + data providers around its navigator.
// (The app already provides NavigationContainer + GestureHandlerRootView.)

import React from 'react';
import { ThemeProvider } from './Theme/themeContext';
import { LaboratoryProvider } from './context/LaboratoryContext';
import LaboratoryNavigator from './navigation/laboratoryNavigator';
import { LabAlertHost } from './components/common/LabAlert';

export default function LaboratoryPortal() {
  return (
    <ThemeProvider>
      <LaboratoryProvider>
        <LaboratoryNavigator />
        {/* App-styled, theme-aware alert host (replaces native Alert.alert) */}
        <LabAlertHost />
      </LaboratoryProvider>
    </ThemeProvider>
  );
}
