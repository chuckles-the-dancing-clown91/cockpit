import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the available modes
export type AppMode = 'writing' | 'research' | 'system';

// Define views for each mode
export type WritingView = 'editor' | 'ideas' | 'archive';
export type ResearchView = 'news' | 'reddit' | 'sources';
export type SystemView = 'settings' | 'storage' | 'logs' | 'tasks';

export type ViewType = WritingView | ResearchView | SystemView;

interface ModeContextType {
  // Current mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  
  // Current view within the mode
  view: ViewType;
  setView: (view: ViewType) => void;
  
  // Helper to get default view for a mode
  getDefaultView: (mode: AppMode) => ViewType;
  
  // Mobile menu state
  isSideNavOpen: boolean;
  setIsSideNavOpen: (open: boolean) => void;
  toggleSideNav: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'cockpit_mode';
const STORAGE_KEY_VIEW = 'cockpit_view';

// Default views for each mode
const defaultViews: Record<AppMode, ViewType> = {
  writing: 'editor',
  research: 'news',
  system: 'settings',
};

interface ModeProviderProps {
  children: ReactNode;
}

export function ModeProvider({ children }: ModeProviderProps) {
  // Initialize from localStorage or use defaults
  const [mode, setModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    return (saved as AppMode) || 'writing';
  });

  const [view, setViewState] = useState<ViewType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW);
    return (saved as ViewType) || defaultViews[mode];
  });

  // Mobile side nav state
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  // Get default view for a mode
  const getDefaultView = (targetMode: AppMode): ViewType => {
    return defaultViews[targetMode];
  };

  // Toggle side nav
  const toggleSideNav = () => {
    setIsSideNavOpen(!isSideNavOpen);
  };

  // Persist mode to localStorage
  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY_MODE, newMode);
    
    // Switch to default view for the new mode
    const defaultView = getDefaultView(newMode);
    setView(defaultView);
  };

  // Persist view to localStorage
  const setView = (newView: ViewType) => {
    setViewState(newView);
    localStorage.setItem(STORAGE_KEY_VIEW, newView);
  };

  // Sync with localStorage on mount
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
    localStorage.setItem(STORAGE_KEY_VIEW, view);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + 1/2/3 for mode switching
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setMode('writing');
        } else if (e.key === '2') {
          e.preventDefault();
          setMode('research');
        } else if (e.key === '3') {
          e.preventDefault();
          setMode('system');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value: ModeContextType = {
    mode,
    setMode,
    view,
    setView,
    getDefaultView,
    isSideNavOpen,
    setIsSideNavOpen,
    toggleSideNav,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

// Custom hook to use the mode context
export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}

// Type guards for views
export function isWritingView(view: ViewType): view is WritingView {
  return ['editor', 'ideas', 'archive'].includes(view);
}

export function isResearchView(view: ViewType): view is ResearchView {
  return ['news', 'reddit', 'sources'].includes(view);
}

export function isSystemView(view: ViewType): view is SystemView {
  return ['settings', 'storage', 'logs', 'tasks'].includes(view);
}
