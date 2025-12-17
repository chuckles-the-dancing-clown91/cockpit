# Layout System Guide

## Overview
This guide documents the layout patterns and best practices for the Architect Cockpit frontend to prevent height/sizing issues and maintain consistency.

## Core Principles

### 1. Height Propagation
For height-based layouts (h-full, h-screen) to work properly, **every parent container** in the chain must have an explicit height:

```tsx
// ✅ CORRECT: Full height chain
<div className="h-screen">           {/* Root: 100vh */}
  <div className="flex flex-col h-full">  {/* Child: 100% of parent */}
    <div className="flex-1 min-h-0">      {/* Grows to fill space */}
      {/* Content with scrolling */}
    </div>
  </div>
</div>

// ❌ WRONG: Broken height chain
<div className="h-screen">
  <div className="flex flex-col">  {/* Missing h-full */}
    <div className="flex-1">       {/* Won't work! */}
      {/* Content */}
    </div>
  </div>
</div>
```

### 2. Flexbox Layout Pattern
Use `flex-1 min-h-0` for scrollable content areas:

```tsx
<div className="flex flex-col h-full">
  {/* Fixed header */}
  <header className="flex-shrink-0">
    <h1>Title</h1>
  </header>
  
  {/* Scrollable content */}
  <div className="flex-1 min-h-0 overflow-auto">
    {/* Content that scrolls */}
  </div>
  
  {/* Fixed footer */}
  <footer className="flex-shrink-0">
    <p>Footer</p>
  </footer>
</div>
```

**Why `min-h-0`?**
- Flex items have an implicit `min-height: auto` which prevents shrinking below content size
- Adding `min-h-0` allows the flex item to shrink and enables scrolling

### 3. Grid Layout Pattern
For multi-column layouts like WritingView:

```tsx
<div className="grid grid-cols-[320px_1fr_420px] gap-3 p-3 h-full">
  {/* Each column needs explicit height handling */}
  <div className="flex flex-col h-full overflow-hidden">
    {/* Column content */}
  </div>
</div>
```

## Standard Layout Classes

### Predefined Utilities (in index.css)

```css
/* Full-height container for main layouts */
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Scrollable area that fills available space */
.layout-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Fixed-size sections (headers, footers) */
.layout-fixed {
  flex-shrink: 0;
}

/* Full-height grid */
.layout-grid-full {
  display: grid;
  height: 100%;
  min-height: 0;
}
```

## Common Patterns

### Pattern 1: Main App Layout
```tsx
// App.tsx structure
<div className="flex h-screen flex-col">
  <TopNav />  {/* flex-shrink-0 by default */}
  <div className="flex flex-1 overflow-hidden">
    <SideNav />
    <main className="flex-1 overflow-auto">
      {/* View content */}
    </main>
  </div>
</div>
```

### Pattern 2: View with Editor
```tsx
// WritingView, etc.
<div className="grid grid-cols-[320px_1fr_420px] gap-3 p-3 h-full">
  {/* Sidebar */}
  <Card className="flex flex-col gap-3 overflow-hidden h-full">
    <div className="flex-shrink-0">Header</div>
    <div className="flex-1 min-h-0 overflow-auto">
      Scrollable content
    </div>
  </Card>
  
  {/* Editor */}
  <div className="flex flex-col gap-3 h-full">
    <Card className="flex-shrink-0">Toolbar</Card>
    <div className="flex-1 min-h-0">
      <MDEditor height="100%" />
    </div>
  </div>
  
  {/* Metadata */}
  <div className="flex flex-col gap-3 h-full min-h-0">
    {/* Content */}
  </div>
</div>
```

### Pattern 3: Card with Scrollable Content
```tsx
<Card className="flex flex-col gap-3 h-full overflow-hidden">
  {/* Fixed header */}
  <div className="flex items-center justify-between">
    <h3>Title</h3>
    <Button>Action</Button>
  </div>
  
  {/* Scrollable content */}
  <ScrollArea className="h-full">
    <div className="flex flex-col gap-2">
      {items.map(item => <Item key={item.id} {...item} />)}
    </div>
  </ScrollArea>
</Card>
```

### Pattern 4: Custom Component with Height Prop
```tsx
// Component that accepts height
interface EditorProps {
  height?: number | string;
}

function CustomEditor({ height = '100%' }: EditorProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">Toolbar</div>
      <div className="flex-1 min-h-0">
        <textarea 
          className="w-full h-full overflow-auto"
          style={{ resize: 'none' }}  // Prevent manual resizing
        />
      </div>
    </div>
  );
}
```

## Troubleshooting

### Problem: Content not scrolling
**Solution:** Check for:
1. Missing `overflow-auto` or `overflow-y-auto`
2. Missing `min-h-0` on flex item
3. Broken height chain (missing h-full on parent)

### Problem: Content overflowing container
**Solution:**
1. Add `overflow-hidden` to container
2. Ensure child has `h-full` or explicit height
3. Use `min-h-0` on flex items

### Problem: Editor/textarea dynamically resizing
**Solution:**
1. Use `height: 100%` not `minHeight` or `maxHeight`
2. Add `resize: 'none'` to style prop
3. Ensure parent has `flex-1 min-h-0`
4. Remove any dynamic height calculations in component internals

### Problem: Grid columns not filling height
**Solution:**
1. Grid container needs `h-full`
2. Each column needs `h-full` or explicit height handling
3. Use `overflow-hidden` on columns with scrollable content

## CSS Variables

### Theme Variables (tokens.css)
All themes must define:
- `--color-bg`, `--color-surface`, `--color-surface-soft`
- `--color-card-bg`
- `--color-border`, `--color-border-subtle`, `--color-border-accent`, `--color-border-accent-soft`
- `--color-text-primary`, `--color-text-muted`, `--color-text-soft`
- `--color-accent`, `--color-accent-strong`, `--color-accent-soft`
- `--color-danger`, `--color-success`
- `--color-nav-bg`, `--color-glow`
- `--shadow-card-elevated`, `--shadow-card-hover`

### Spacing
- `--radius-card`: 1rem (16px)
- `--radius-button`: 0.55rem (~9px)

## Best Practices

### DO ✅
- Use `h-full` on containers that should fill parent height
- Use `flex-1 min-h-0` for scrollable flex items
- Use `flex-shrink-0` for fixed-size headers/footers
- Use `overflow-auto` or `overflow-hidden` explicitly
- Add `resize: 'none'` to textareas/editors
- Test with different content sizes (empty, medium, overflowing)

### DON'T ❌
- Don't use `minHeight`/`maxHeight` for main layout sizing
- Don't forget `min-h-0` on flex items
- Don't use `h-screen` inside already-sized containers
- Don't let textarea/editor components resize dynamically
- Don't skip height declarations in the parent chain
- Don't mix percentage heights without explicit parent heights

## Testing Checklist

Before committing layout changes, verify:
- [ ] Content doesn't overflow container
- [ ] Scrolling works where expected
- [ ] Editor/textarea doesn't dynamically resize
- [ ] Layout works with different content sizes
- [ ] No horizontal scrollbars (unless intended)
- [ ] Height chain is complete (all parents have heights)
- [ ] Works in all three themes (dark/cyberpunk/light)

## Examples in Codebase

Good examples to reference:
- `App.tsx` - Main app layout with TopNav + SideNav
- `WritingView.tsx` - 3-column grid with editor
- `vendor/MDEditor.tsx` - Custom component with height prop
- `components/ui/Card.tsx` - Flexible card component

## Known Issues & Patterns

### Radix DropdownMenu/Select + HoverCard Interaction (Dec 2025)

**Issue**: When using Radix DropdownMenu or Select inside a HoverCard, the dropdown may cause the HoverCard to close unexpectedly. This is caused by the dropdown acting as a "modal" by default, which blocks pointer events on the rest of the page, interfering with the HoverCard's hover detection.

**Solution**: Add `modal={false}` to the DropdownMenu.Root or Select.Root component:

```tsx
import * as HoverCard from '@radix-ui/react-hover-card';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

function ComponentWithHoverCard() {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        {/* Trigger element */}
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content>
          {/* Add modal={false} to prevent interference */}
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger>
              {/* Dropdown trigger */}
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                {/* Dropdown items */}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
```

**What `modal={false}` does**:
- Prevents the dropdown from acting as a modal that blocks pointer events
- Allows the HoverCard to remain open while interacting with the dropdown
- The dropdown still functions normally with full keyboard navigation
- No complex state management or timeout logic needed

**Alternative Solutions** (if `modal={false}` doesn't work):
1. Update all `@radix-ui/react-*` packages to latest matching versions
2. Use controlled state tracking (see git history for complex implementation)
3. Apply CSS workaround: `pointer-events: auto !important` on dropdown content

**Reference**: See [IdeaHoverCard.tsx](writing/components/editor/IdeaHoverCard.tsx) for working implementation

**Related**: This is a known issue with Radix UI's `DismissableLayer` primitive. See [Radix UI GitHub issues](https://github.com/radix-ui/primitives/issues) for detailed discussions.

---

### Tauri Context Menu for Text Selection (Dec 2025)

**Use Case**: Enable right-click context menu on text selections (e.g., "Add to Notes" from article viewer).

**Implementation** (using `@tauri-apps/api/menu`):

```tsx
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

function ComponentWithContextMenu() {
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    let contextMenu: Menu | null = null;

    const setupContextMenu = async () => {
      contextMenu = await Menu.new({
        items: [
          await MenuItem.new({
            text: 'Add to Notes',
            accelerator: 'CmdOrCtrl+Shift+N', // Optional keyboard shortcut
            action: () => {
              if (selectedText) {
                // Handle the action (e.g., add to notes)
                console.log('Adding to notes:', selectedText);
              }
            },
          }),
          await MenuItem.new({
            text: 'Copy',
            accelerator: 'CmdOrCtrl+C',
            action: () => {
              if (selectedText) {
                navigator.clipboard.writeText(selectedText);
              }
            },
          }),
        ],
      });
    };

    const handleContextMenu = async (e: MouseEvent) => {
      // Get selected text
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      
      if (text) {
        e.preventDefault(); // Prevent browser default context menu
        setSelectedText(text);

        if (!contextMenu) {
          await setupContextMenu();
        }

        // Show context menu at cursor position
        if (contextMenu) {
          await contextMenu.popup({
            x: e.clientX,
            y: e.clientY,
          }, getCurrentWindow());
        }
      }
    };

    // Add event listener
    document.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      if (contextMenu) {
        contextMenu.close();
      }
    };
  }, [selectedText]);

  return (
    <div>
      <p>Select text and right-click for context menu</p>
    </div>
  );
}
```

**Key Points**:
- **Menu Creation**: Use `Menu.new()` with array of `MenuItem` objects
- **Text Selection**: Use `window.getSelection()` to get highlighted text
- **Position**: Pass `{ x, y }` coordinates to `menu.popup()` for cursor positioning
- **Cleanup**: Always close menu in `useEffect` cleanup to prevent memory leaks
- **Conditional Display**: Only show menu when text is selected (check `text.trim()`)

**Iframe Considerations**:
When using context menu with iframes (e.g., article viewer):
1. Add event listener to parent window (not iframe)
2. Text selection works if iframe is same-origin or has appropriate CORS headers
3. For cross-origin iframes, use `postMessage` API to communicate selections

**Platform Support**:
- ✅ Windows: Full support
- ✅ macOS: Full support  
- ✅ Linux: Full support

**Related APIs**:
- `Menu.popup()` - Show context menu at specific position
- `MenuItem.new()` - Create menu items with text, icons, actions
- `getCurrentWindow()` - Get window handle for menu popup

**Reference**: See [RightSidebar.tsx](writing/components/editor/RightSidebar.tsx) for working implementation with article viewer.

---

**Last Updated:** 2025-12-16  
**Maintainer:** Keep this guide updated when adding new layout patterns
