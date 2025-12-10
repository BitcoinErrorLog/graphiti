/**
 * @fileoverview Theme context for managing light/dark theme preferences.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages theme state.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (initialized) {
      applyTheme(theme);
      saveTheme(theme);
    }
  }, [theme, initialized]);

  const loadTheme = async () => {
    try {
      const savedTheme = await storage.getSetting<Theme>('theme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setThemeState(savedTheme);
      } else {
        // Default to dark theme
        setThemeState('dark');
      }
      setInitialized(true);
      applyTheme(savedTheme || 'dark');
    } catch (error) {
      logger.error('ThemeContext', 'Failed to load theme', error as Error);
      setThemeState('dark');
      setInitialized(true);
      applyTheme('dark');
    }
  };

  const applyTheme = (themeToApply: Theme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeToApply);
    logger.debug('ThemeContext', 'Theme applied', { theme: themeToApply });
  };

  const saveTheme = async (themeToSave: Theme) => {
    try {
      await storage.saveSetting('theme', themeToSave);
      logger.debug('ThemeContext', 'Theme saved', { theme: themeToSave });
    } catch (error) {
      logger.error('ThemeContext', 'Failed to save theme', error as Error);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
