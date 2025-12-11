import { useMemo } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { useSystemUser } from '../../hooks/queries';
import { cn } from '../../lib/cn';

export type ViewId = 'dashboard' | 'writing' | 'reddit' | 'calendar' | 'files';

type NavBarProps = {
  view: ViewId;
  onChangeView: (id: ViewId) => void;
};

export function NavBar({ view, onChangeView }: NavBarProps) {
  const { theme, setTheme } = useTheme();
  const { data: systemUser } = useSystemUser();

  const tabs = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'writing', label: 'Writing' },
      { id: 'reddit', label: 'Reddit' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'files', label: 'Files' },
    ] as { id: ViewId; label: string }[],
    []
  );

  return (
    <header className="sticky top-0 z-10 bg-[var(--color-surface)]/90 backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[var(--color-accent-soft)] border border-[var(--color-border)] grid place-items-center text-[var(--color-text-primary)] font-bold shadow-[var(--shadow-card)]">
            AC
          </div>
          <div>
            <div className="text-lg font-semibold text-[var(--color-text-primary)]">Architect Cockpit</div>
            <div className="text-xs text-[var(--color-text-muted)]">Control surface for your stack</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={view === tab.id ? 'solid' : 'ghost'}
              className={cn('rounded-full px-4', view === tab.id ? '' : 'border border-[var(--color-border)]')}
              onClick={() => onChangeView(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-[var(--color-text-muted)]">
            Welcome, <span className="text-[var(--color-text-primary)]">{systemUser ?? 'Pilot'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
