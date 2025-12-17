import { useTheme, type ThemeId } from '@/core/theme/ThemeProvider';
import { Moon, Sun, Zap } from 'lucide-react';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: ThemeId[] = ['dark', 'light', 'cyberpunk'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />;
      case 'cyberpunk':
        return <Zap className="h-5 w-5" />;
      default:
        return <Moon className="h-5 w-5" />;
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="rounded-md p-2 text-[var(--color-text-soft)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-all duration-200 hover:scale-110"
      aria-label={`Current theme: ${theme}. Click to cycle themes`}
      title={`Current: ${theme}`}
    >
      {getThemeIcon()}
    </button>
  );
}
