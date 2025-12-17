import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { useMode, type AppMode, type ViewType } from '@/core/context/ModeContext';
import { ThemeSwitcher } from './ThemeSwitcher';
import { NavigationDropdown } from './NavigationDropdown';
import {
  PenTool,
  Lightbulb,
  Archive,
  Radio,
  Plug,
  Newspaper,
  Share2,
  Settings,
  Database,
  FileText,
  Clock,
  ChevronDown,
} from 'lucide-react';

export function AppNavigation() {
  const { mode, view, setMode, setView } = useMode();

  const handleNavigate = (targetMode: AppMode, targetView: ViewType) => {
    setMode(targetMode);
    setView(targetView);
  };

  const writingNavItems = [
    { id: 'editor' as ViewType, label: 'Editor', icon: PenTool, description: 'Write and edit content' },
    { id: 'ideas' as ViewType, label: 'Ideas', icon: Lightbulb, description: 'Manage ideas library' },
    { id: 'archive' as ViewType, label: 'Archive', icon: Archive, description: 'View archived content' },
  ];

  const researchNavItems = [
    { id: 'stream' as ViewType, label: 'Stream', icon: Radio, description: 'Unified article feed' },
    { id: 'feed-sources' as ViewType, label: 'Feed Sources', icon: Plug, description: 'Manage feed plugins' },
    { id: 'news' as ViewType, label: 'News', icon: Newspaper, description: 'News aggregation' },
    { id: 'reddit' as ViewType, label: 'Reddit', icon: Share2, description: 'Reddit integration' },
  ];

  const systemNavItems = [
    { id: 'settings' as ViewType, label: 'Settings', icon: Settings, description: 'App configuration' },
    { id: 'storage' as ViewType, label: 'Storage', icon: Database, description: 'Backups and exports' },
    { id: 'logs' as ViewType, label: 'Logs', icon: FileText, description: 'Application logs' },
    { id: 'tasks' as ViewType, label: 'Tasks', icon: Clock, description: 'Scheduled tasks' },
  ];

  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-surface)] relative z-50">
      <div className="flex h-14 items-center px-4">
        {/* Logo */}
        <div className="mr-6 flex items-center space-x-2">
          <div className="text-lg font-bold text-[var(--color-text-primary)]">Cockpit</div>
        </div>

        {/* Navigation Menu */}
        <NavigationMenu.Root className="relative flex-1" delayDuration={0}>
          <NavigationMenu.List className="flex items-center space-x-1">
            {/* Writing Domain */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger
                className={`
                  group flex items-center space-x-1 px-3 py-2 rounded-md
                  text-sm font-medium transition-all duration-200 relative
                  ${
                    mode === 'writing'
                      ? 'text-[var(--color-primary)] bg-[var(--color-surface-hover)] font-semibold shadow-sm'
                      : 'text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  }
                `}
              >
                <span>Writing</span>
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
                {mode === 'writing' && (
                  <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full" />
                )}
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className="
                  absolute top-0 left-0 w-full
                  data-[motion=from-start]:animate-enterFromLeft
                  data-[motion=from-end]:animate-enterFromRight
                  data-[motion=to-start]:animate-exitToLeft
                  data-[motion=to-end]:animate-exitToRight
                "
              >
                <NavigationDropdown
                  items={writingNavItems}
                  mode="writing"
                  currentView={view}
                  currentMode={mode}
                  onNavigate={handleNavigate}
                />
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* Research Domain */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger
                className={`
                  group flex items-center space-x-1 px-3 py-2 rounded-md
                  text-sm font-medium transition-all duration-200 relative
                  ${
                    mode === 'research'
                      ? 'text-[var(--color-primary)] bg-[var(--color-surface-hover)] font-semibold shadow-sm'
                      : 'text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  }
                `}
              >
                <span>Research</span>
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
                {mode === 'research' && (
                  <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full" />
                )}
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className="
                  absolute top-0 left-0 w-full
                  data-[motion=from-start]:animate-enterFromLeft
                  data-[motion=from-end]:animate-enterFromRight
                  data-[motion=to-start]:animate-exitToLeft
                  data-[motion=to-end]:animate-exitToRight
                "
              >
                <NavigationDropdown
                  items={researchNavItems}
                  mode="research"
                  currentView={view}
                  currentMode={mode}
                  onNavigate={handleNavigate}
                />
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* System Domain */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger
                className={`
                  group flex items-center space-x-1 px-3 py-2 rounded-md
                  text-sm font-medium transition-all duration-200 relative
                  ${
                    mode === 'system'
                      ? 'text-[var(--color-primary)] bg-[var(--color-surface-hover)] font-semibold shadow-sm'
                      : 'text-[var(--color-text-soft)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  }
                `}
              >
                <span>System</span>
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
                {mode === 'system' && (
                  <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full" />
                )}
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className="
                  absolute top-0 left-0 w-full
                  data-[motion=from-start]:animate-enterFromLeft
                  data-[motion=from-end]:animate-enterFromRight
                  data-[motion=to-start]:animate-exitToLeft
                  data-[motion=to-end]:animate-exitToRight
                "
              >
                <NavigationDropdown
                  items={systemNavItems}
                  mode="system"
                  currentView={view}
                  currentMode={mode}
                  onNavigate={handleNavigate}
                />
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* Active indicator */}
            <NavigationMenu.Indicator className="
              flex items-end justify-center h-[2px] top-full overflow-hidden z-10
              transition-all duration-250
              data-[state=visible]:animate-fadeIn
              data-[state=hidden]:animate-fadeOut
            ">
              <div className="relative top-1/2 w-full h-[2px] bg-[var(--color-primary)] rounded-full" />
            </NavigationMenu.Indicator>
          </NavigationMenu.List>

          {/* Viewport for content positioning */}
          <div className="absolute left-0 top-full w-full perspective-[2000px] z-50">
            <NavigationMenu.Viewport
              className="
                relative origin-top-center mt-2 w-full
                overflow-visible rounded-lg
                bg-[var(--color-surface-soft)]
                border border-[var(--color-border)]
                shadow-[var(--shadow-card-elevated)]
                transition-all duration-300 ease-out
                h-[var(--radix-navigation-menu-viewport-height)]
                data-[state=open]:animate-scaleIn
                data-[state=closed]:animate-scaleOut
              "
            />
          </div>
        </NavigationMenu.Root>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme Switcher */}
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
