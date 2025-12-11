import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type ThemeId = 'dark' | 'cyberpunk' | 'light';

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (next: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem('cockpit-theme');
  if (stored === 'dark' || stored === 'cyberpunk' || stored === 'light') return stored;
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(getInitialTheme);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('cockpit-theme', theme);
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-cyberpunk', 'theme-light');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

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
