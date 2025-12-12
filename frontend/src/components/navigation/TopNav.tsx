import { useMode, AppMode } from './ModeContext';
import { useTheme } from '../../theme/ThemeProvider';
import { Moon, Sun, Menu, X } from 'lucide-react';

export function TopNav() {
  const { mode, setMode, isSideNavOpen, toggleSideNav } = useMode();
  const { theme, setTheme } = useTheme();

  const modes: { id: AppMode; label: string }[] = [
    { id: 'writing', label: 'Writing' },
    { id: 'research', label: 'Research' },
    { id: 'system', label: 'System' },
  ];

  return (
    <nav className="border-b border-border bg-background" role="navigation" aria-label="Top navigation">
      <div className="flex h-14 items-center px-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleSideNav}
          className="mr-4 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          aria-label={isSideNavOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isSideNavOpen}
        >
          {isSideNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo/Title */}
        <div className="mr-6 flex items-center space-x-2">
          <div className="text-lg font-bold">Cockpit</div>
        </div>

        {/* Mode Switcher - Hidden on mobile */}
        <div className="hidden items-center space-x-1 rounded-lg bg-muted p-1 md:flex">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`
                rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200
                ${
                  mode === m.id
                    ? 'bg-background text-foreground shadow-sm scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:scale-105'
                }
              `}
              aria-label={`Switch to ${m.label} mode`}
              aria-current={mode === m.id ? 'page' : undefined}
            >
              {m.label}
              <span className="sr-only">{mode === m.id ? ' (current)' : ''}</span>
            </button>
          ))}
        </div>

        {/* Mobile Mode Switcher */}
        <div className="flex items-center space-x-1 rounded-lg bg-muted p-1 md:hidden">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`
                rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200
                ${
                  mode === m.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }
              `}
              aria-label={`Switch to ${m.label} mode`}
              aria-current={mode === m.id ? 'page' : undefined}
            >
              {m.label.charAt(0)}
              <span className="sr-only">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 hover:scale-110"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* User Menu Placeholder */}
        <div className="ml-2 h-8 w-8 rounded-full bg-muted" role="img" aria-label="User profile" />
      </div>
    </nav>
  );
}
