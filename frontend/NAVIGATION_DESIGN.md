# Navigation Design: Radix Navigation Menu

**Status**: Design Phase  
**Date**: December 15, 2025  
**Goal**: Replace TopNav/SideNav with Radix NavigationMenu for accessible, modern navigation

---

## Current vs New Architecture

### Current (TopNav + SideNav)
```
TopNav (horizontal)
├── Logo
├── Mode switcher (Writing | Research | System)
└── Theme switcher

SideNav (vertical, mode-dependent)
├── Writing: Editor, Ideas, Archive
├── Research: News, Stream, Feed Sources, Reddit
└── System: Settings, Storage, Logs, Tasks
```

**Problems**:
- Two separate navigation systems (confusing)
- Mobile menu requires overlay and transforms
- Mode switcher separate from view navigation
- Not using Radix primitives (accessibility gaps)
- TopNav/SideNav coupling with ModeContext

### New (Radix NavigationMenu)
```
NavigationMenu (horizontal, single component)
├── Writing (dropdown)
│   ├── Editor
│   ├── Ideas
│   └── Archive
├── Research (dropdown)
│   ├── Stream
│   ├── Feed Sources
│   ├── News
│   └── Reddit
├── System (dropdown)
│   ├── Settings
│   ├── Storage
│   ├── Logs
│   └── Tasks
└── Theme Switcher (right-aligned)
```

**Benefits**:
- ✅ Single navigation component (simpler)
- ✅ Full keyboard navigation (ARIA compliant)
- ✅ No mobile overlay needed (responsive dropdowns)
- ✅ Mode + View integrated (one click to anywhere)
- ✅ Radix primitives (accessibility built-in)
- ✅ Cleaner ModeContext (just state, no UI logic)

---

## Component Structure

### File Organization
```
frontend/src/core/components/layout/
├── AppNavigation.tsx          # Main navigation component
├── NavigationDropdown.tsx     # Reusable dropdown content
└── ThemeSwitcher.tsx          # Theme toggle button
```

### AppNavigation.tsx (Main Component)
```tsx
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { useMode } from '@/core/context/ModeContext';
import { ThemeSwitcher } from './ThemeSwitcher';
import { NavigationDropdown } from './NavigationDropdown';

export function AppNavigation() {
  const { mode, view, setMode, setView } = useMode();

  const handleNavigate = (targetMode: AppMode, targetView: ViewType) => {
    setMode(targetMode);
    setView(targetView);
  };

  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-14 items-center px-4">
        {/* Logo */}
        <div className="mr-6 flex items-center space-x-2">
          <div className="text-lg font-bold text-[var(--color-text-primary)]">
            Cockpit
          </div>
        </div>

        {/* Navigation Menu */}
        <NavigationMenu.Root className="relative flex-1">
          <NavigationMenu.List className="flex items-center space-x-1">
            
            {/* Writing Domain */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="...">
                Writing
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="...">
                <NavigationDropdown
                  items={[
                    { id: 'editor', label: 'Editor', icon: PenTool },
                    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
                    { id: 'archive', label: 'Archive', icon: Archive },
                  ]}
                  mode="writing"
                  currentView={view}
                  onNavigate={handleNavigate}
                />
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* Research Domain */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="...">
                Research
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="...">
                <NavigationDropdown
                  items={[
                    { id: 'stream', label: 'Stream', icon: Radio },
                    { id: 'feed-sources', label: 'Feed Sources', icon: Plug },
                    { id: 'news', label: 'News', icon: Newspaper },
                    { id: 'reddit', label: 'Reddit', icon: Share2 },
                  ]}
                  mode="research"
                  currentView={view}
                  onNavigate={handleNavigate}
                />
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* System Domain */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger className="...">
                System
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="...">
                <NavigationDropdown
                  items={[
                    { id: 'settings', label: 'Settings', icon: Settings },
                    { id: 'storage', label: 'Storage', icon: Database },
                    { id: 'logs', label: 'Logs', icon: FileText },
                    { id: 'tasks', label: 'Tasks', icon: Clock },
                  ]}
                  mode="system"
                  currentView={view}
                  onNavigate={handleNavigate}
                />
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            {/* Active indicator */}
            <NavigationMenu.Indicator className="..." />
          </NavigationMenu.List>

          {/* Viewport for content positioning */}
          <div className="absolute left-0 top-full w-full perspective-[2000px]">
            <NavigationMenu.Viewport className="..." />
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
```

### NavigationDropdown.tsx (Reusable Dropdown)
```tsx
interface NavigationDropdownProps {
  items: NavItem[];
  mode: AppMode;
  currentView: ViewType;
  onNavigate: (mode: AppMode, view: ViewType) => void;
}

export function NavigationDropdown({
  items,
  mode,
  currentView,
  onNavigate,
}: NavigationDropdownProps) {
  return (
    <ul className="grid w-[400px] gap-2 p-4">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <li key={item.id}>
            <NavigationMenu.Link asChild>
              <button
                onClick={() => onNavigate(mode, item.id)}
                className={`
                  flex w-full items-center space-x-3 rounded-md px-3 py-2
                  transition-colors
                  ${isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-sm text-[var(--color-text-soft)]">
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
```

---

## Styling with CSS Custom Properties

### Navigation Trigger (Domain Buttons)
```css
.navigation-trigger {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-input);
  background: transparent;
  color: var(--color-text-soft);
  font-weight: 500;
  transition: all 0.2s;
}

.navigation-trigger:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.navigation-trigger[data-state='open'] {
  background: var(--color-surface-hover);
  color: var(--color-primary);
}
```

### Dropdown Content
```css
.navigation-content {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--radix-navigation-menu-viewport-width);
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card-elevated);
  animation-duration: 250ms;
  animation-timing-function: ease;
}

.navigation-content[data-motion='from-start'] {
  animation-name: enterFromLeft;
}

.navigation-content[data-motion='from-end'] {
  animation-name: enterFromRight;
}

.navigation-content[data-motion='to-start'] {
  animation-name: exitToLeft;
}

.navigation-content[data-motion='to-end'] {
  animation-name: exitToRight;
}
```

### Viewport
```css
.navigation-viewport {
  position: relative;
  transform-origin: top center;
  margin-top: 0.5rem;
  width: 100%;
  height: var(--radix-navigation-menu-viewport-height);
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--color-surface-soft);
  transition: width, height, 300ms ease;
}

.navigation-viewport[data-state='open'] {
  animation: scaleIn 200ms ease;
}

.navigation-viewport[data-state='closed'] {
  animation: scaleOut 200ms ease;
}
```

### Active Indicator
```css
.navigation-indicator {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 2px;
  top: 100%;
  overflow: hidden;
  z-index: 1;
  transition: width, transform 250ms ease;
}

.navigation-indicator > div {
  position: relative;
  top: 50%;
  width: 100%;
  height: 2px;
  background: var(--color-primary);
  border-radius: 2px;
}
```

---

## Keyboard Navigation

### Built-in Radix Shortcuts
- **Tab** - Move between menu triggers
- **Enter/Space** - Open dropdown
- **Escape** - Close dropdown
- **Arrow Down** - Navigate to first item in dropdown
- **Arrow Up/Down** - Navigate between dropdown items
- **Home/End** - Jump to first/last item

### Custom Shortcuts (Optional)
- **Cmd/Ctrl + 1** - Writing mode (first item)
- **Cmd/Ctrl + 2** - Research mode (first item)
- **Cmd/Ctrl + 3** - System mode (first item)

---

## Responsive Design

### Desktop (> 768px)
- Full horizontal navigation with dropdowns
- All menu items visible
- Theme switcher on right

### Mobile (< 768px)
**Option A**: Dropdown-style menu (recommended)
```tsx
<select className="mobile-nav-select">
  <optgroup label="Writing">
    <option>Editor</option>
    <option>Ideas</option>
    <option>Archive</option>
  </optgroup>
  <optgroup label="Research">
    <option>Stream</option>
    <option>Feed Sources</option>
    <option>News</option>
    <option>Reddit</option>
  </optgroup>
  <optgroup label="System">
    <option>Settings</option>
    <option>Storage</option>
    <option>Logs</option>
    <option>Tasks</option>
  </optgroup>
</select>
```

**Option B**: Radix Dialog with menu (more complex)
- Hamburger button opens dialog
- Full menu tree in dialog
- Close on selection

---

## Implementation Checklist

### Phase 1: Setup (15 min)
- [ ] Install `@radix-ui/react-navigation-menu`
- [ ] Create `AppNavigation.tsx` file
- [ ] Create `NavigationDropdown.tsx` file
- [ ] Extract `ThemeSwitcher.tsx` from TopNav

### Phase 2: Build Navigation (30 min)
- [ ] Implement `AppNavigation` with 3 domains
- [ ] Implement `NavigationDropdown` component
- [ ] Add icons and labels
- [ ] Wire up ModeContext integration

### Phase 3: Styling (30 min)
- [ ] Add CSS custom properties styling
- [ ] Implement hover states
- [ ] Add active indicator animation
- [ ] Add dropdown enter/exit animations

### Phase 4: Testing (20 min)
- [ ] Test keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Test mouse interaction
- [ ] Verify active states work correctly
- [ ] Test mode/view switching

### Phase 5: Cleanup (15 min)
- [ ] Remove old TopNav.tsx
- [ ] Remove old SideNav.tsx
- [ ] Update App.tsx to use AppNavigation
- [ ] Remove unused ModeContext UI logic
- [ ] Test build

### Phase 6: Polish (20 min)
- [ ] Add mobile responsive behavior
- [ ] Test on small screens
- [ ] Verify accessibility with screen reader
- [ ] Update documentation

**Total Estimated Time**: 2 hours 10 minutes

---

## Migration Notes

### ModeContext Changes
**Before** (TopNav/SideNav):
```typescript
// UI-specific state in context
const [isSideNavOpen, setIsSideNavOpen] = useState(false);
const toggleSideNav = () => setIsSideNavOpen(!isSideNavOpen);

// Exposed in context
{ mode, view, setMode, setView, isSideNavOpen, setIsSideNavOpen, toggleSideNav }
```

**After** (AppNavigation):
```typescript
// Pure state only
// No UI-specific state needed

// Exposed in context
{ mode, view, setMode, setView }
```

### App.tsx Changes
**Before**:
```tsx
<TopNav />
<div className="flex">
  <SideNav />
  <main>{renderView()}</main>
</div>
```

**After**:
```tsx
<AppNavigation />
<main className="flex-1">{renderView()}</main>
```

---

## Future Enhancements

### Command Palette (Post-MVP)
- Add Cmd+K shortcut
- Search all views
- Recent views history
- Quick actions

### Breadcrumbs (Optional)
```tsx
<div className="text-sm text-[var(--color-text-soft)]">
  <span>Research</span>
  <span className="mx-2">/</span>
  <span className="text-[var(--color-text-primary)]">Stream</span>
</div>
```

### View Descriptions (Optional)
Add descriptions to nav items for clarity:
```typescript
{
  id: 'stream',
  label: 'Stream',
  description: 'Unified article feed with filters',
  icon: Radio,
}
```

---

**Design Status**: ✅ COMPLETE - Ready for implementation  
**Next Step**: Install Radix package and build AppNavigation.tsx
