import { Theme as RadixTheme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '@/shared/types';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('cockpit-theme');
    return (stored as Theme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('cockpit-theme', theme);
    
    // Apply theme-specific classes to document
    document.documentElement.classList.remove('dark', 'light', 'cyberpunk');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Map our theme names to Radix appearance
  const appearance = theme === 'light' ? 'light' : 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <RadixTheme
        appearance={appearance}
        accentColor={theme === 'cyberpunk' ? 'purple' : 'blue'}
        grayColor="slate"
        radius="medium"
        scaling="100%"
      >
        {children}
      </RadixTheme>
    </ThemeContext.Provider>
  );
}
