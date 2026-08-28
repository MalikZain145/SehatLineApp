import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import lightTheme from "./lightTheme";
import darkTheme from "./darkTheme";

type ThemeType = typeof lightTheme;

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext({} as ThemeContextType);

interface Props {
  children: ReactNode;
}

export function ThemeProvider({ children }: Props) {

  const [isDark, setIsDark] = useState(false);

  // Load saved theme
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("APP_THEME");

      if (savedTheme !== null) {
        setIsDark(savedTheme === "dark");
      }
    } catch (error) {
      console.log("Theme Load Error:", error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newValue = !isDark;

      setIsDark(newValue);

      await AsyncStorage.setItem(
        "APP_THEME",
        newValue ? "dark" : "light"
      );

    } catch (error) {
      console.log("Theme Save Error:", error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: isDark ? darkTheme : lightTheme,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);