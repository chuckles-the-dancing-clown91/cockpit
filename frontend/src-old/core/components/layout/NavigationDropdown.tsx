import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { type LucideIcon } from 'lucide-react';
import { type AppMode, type ViewType } from '@/core/context/ModeContext';

interface NavItem {
  id: ViewType;
  label: string;
  description?: string;
  icon: LucideIcon;
}

interface NavigationDropdownProps {
  items: NavItem[];
  mode: AppMode;
  currentView: ViewType;
  currentMode: AppMode;
  onNavigate: (mode: AppMode, view: ViewType) => void;
}

export function NavigationDropdown({
  items,
  mode,
  currentView,
  currentMode,
  onNavigate,
}: NavigationDropdownProps) {
  return (
    <ul className="grid w-[400px] gap-2 p-4 pb-6">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentMode === mode && currentView === item.id;

        return (
          <li key={item.id}>
            <NavigationMenu.Link asChild>
              <button
                onClick={() => onNavigate(mode, item.id)}
                className={`
                  flex w-full items-center space-x-3 rounded-md px-3 py-2.5
                  transition-all duration-200 relative
                  ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-md scale-[1.02] ring-2 ring-[var(--color-primary)]/30'
                      : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                )}
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-[var(--color-text-soft)]'}`} />
                <div className="text-left flex-1">
                  <div className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</div>
                  {item.description && (
                    <div className={`text-xs mt-0.5 ${isActive ? 'text-white/90' : 'text-[var(--color-text-soft)]'}`}>
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            </NavigationMenu.Link>
          </li>
        );
      })}
    </ul>
  );
}
