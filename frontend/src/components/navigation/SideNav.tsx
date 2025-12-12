import { useMode, ViewType, WritingView, ResearchView, SystemView } from './ModeContext';
import {
  PenTool,
  Lightbulb,
  Archive,
  Newspaper,
  Rss,
  Share2,
  Settings,
  Database,
  FileText,
  Clock,
} from 'lucide-react';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const writingNavItems: NavItem[] = [
  { id: 'editor', label: 'Editor', icon: PenTool },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'archive', label: 'Archive', icon: Archive },
];

const researchNavItems: NavItem[] = [
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'reddit', label: 'Reddit', icon: Share2 },
  { id: 'sources', label: 'Sources', icon: Rss },
];

const systemNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'storage', label: 'Storage', icon: Database },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: Clock },
];

export function SideNav() {
  const { mode, view, setView, isSideNavOpen, setIsSideNavOpen } = useMode();

  // Get nav items based on current mode
  const navItems =
    mode === 'writing'
      ? writingNavItems
      : mode === 'research'
      ? researchNavItems
      : systemNavItems;

  const handleNavClick = (viewId: ViewType) => {
    setView(viewId);
    // Close mobile menu after navigation
    if (window.innerWidth < 768) {
      setIsSideNavOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isSideNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsSideNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Side Navigation */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-56 border-r border-border bg-background
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${isSideNavOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Side navigation"
      >
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium 
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm scale-105'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:scale-105'
                  }
                `}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="sr-only">{isActive ? ' (current)' : ''}</span>
              </button>
            );
          })}
        </nav>

        {/* Mode Info on Mobile */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-muted/30 p-3 text-xs text-muted-foreground md:hidden">
          <div className="font-medium capitalize">{mode} Mode</div>
          <div className="text-[10px] mt-1">Use ⌘1/2/3 to switch modes</div>
        </div>
      </aside>
    </>
  );
}
