import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import storage from '../utils/storage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themePreference, setThemePreference] = useState('system'); // 'system' | 'light' | 'dark'

  useEffect(() => {
    storage.getItem('news_theme_pref').then((pref) => {
      if (pref) {
        setThemePreference(pref);
        if (pref === 'dark') setIsDarkMode(true);
        else if (pref === 'light') setIsDarkMode(false);
        else setIsDarkMode(systemScheme === 'dark');
      } else {
        setIsDarkMode(systemScheme === 'dark');
      }
    });
  }, [systemScheme]);

  const toggleTheme = async () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    const pref = nextDark ? 'dark' : 'light';
    setThemePreference(pref);
    await storage.setItem('news_theme_pref', pref);
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        themePreference,
        toggleTheme,
        colors,
        typography,
        spacing,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;

