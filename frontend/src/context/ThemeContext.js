// ThemeContext — provides light/dark colors app-wide.
//
// Screens read colors via useTheme() instead of the static COLORS import so
// they react to dark mode. The chosen mode is persisted locally and synced to
// the backend (via Settings). Wrap the app in <ThemeProvider>.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as BASE } from '../theme';

// Light palette = the existing brand colors, verbatim. Kept === BASE so light
// mode renders pixel-identical to before dark mode existed.
const LIGHT = {
  ...BASE,
  mode: 'light',
};

// Dark palette — keeps the cyan/navy brand, dark surfaces.
const DARK = {
  ...BASE,
  mode: 'dark',
  background: '#0B1220',
  backgroundSecondary: '#111A2B',
  card: '#1A2436',
  surface: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textLight: '#94A3B8',
  white: '#FFFFFF',
  border: '#2A3750',
  borderLight: '#233047',
  // Brand accents stay vivid on dark.
  primary: '#3FC4B6',
  secondary: '#5FC9BF',
  navy: '#0BAA9D',
};

const ThemeContext = createContext({
  colors: LIGHT,
  isDark: false,
  toggleTheme: () => {},
  setDark: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  // Load saved preference on boot.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('appSettings');
        if (saved) {
          const data = JSON.parse(saved);
          if (typeof data.darkMode === 'boolean') setIsDark(data.darkMode);
        }
      } catch (e) { /* default light */ }
    })();
  }, []);

  const persist = useCallback(async (value) => {
    try {
      const saved = await AsyncStorage.getItem('appSettings');
      const data = saved ? JSON.parse(saved) : {};
      data.darkMode = value;
      await AsyncStorage.setItem('appSettings', JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => { persist(!prev); return !prev; });
  }, [persist]);

  const setDark = useCallback((value) => {
    setIsDark(!!value); persist(!!value);
  }, [persist]);

  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { LIGHT, DARK };
export default ThemeContext;
