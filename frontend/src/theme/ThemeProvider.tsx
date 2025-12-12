import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

type ThemeId = 'dark' | 'cyberpunk' | 'light';

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (next: ThemeId) => void;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface AppSettings {
  [category: string]: {
    [key: string]: {
      value: string | number | boolean;
      description: string;
    };
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Load initial theme from database
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await invoke<AppSettings>('get_app_settings');
        const dbTheme = settings?.appearance?.['app.theme']?.value as string;
        if (dbTheme === 'dark' || dbTheme === 'cyberpunk' || dbTheme === 'light') {
          setThemeState(dbTheme);
        }
      } catch (error) {
        console.error('Failed to load theme from database:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-cyberpunk', 'theme-light');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  // Wrapper to update both state and database
  const setTheme = async (next: ThemeId) => {
    setThemeState(next);
    try {
      await invoke('update_setting', {
        input: {
          key: 'app.theme',
          value: next,
        },
      });
    } catch (error) {
      console.error('Failed to save theme to database:', error);
    }
  };

  const value = useMemo(() => ({ theme, setTheme, isLoading }), [theme, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      <div className="app-root">{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export type { ThemeId };

export type { ThemeId };
