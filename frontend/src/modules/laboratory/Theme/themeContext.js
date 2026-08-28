import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme } from "./themes";

const ThemeContext = createContext(null);
const STORAGE_KEY = "lab_theme_dark";

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  // Load the saved preference once, so dark mode survives app restarts.
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (v === "1") setIsDark(true);
      } catch (e) { /* default light */ }
    })();
  }, []);

  const toggleTheme = () => {
    setIsDark((previous) => {
      const next = !previous;
      AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0").catch(() => {});
      return next;
    });
  };

  const setDark = (value) => {
    setIsDark(!!value);
    AsyncStorage.setItem(STORAGE_KEY, value ? "1" : "0").catch(() => {});
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setDark, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
