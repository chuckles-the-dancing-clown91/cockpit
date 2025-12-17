import * as Tabs from '@radix-ui/react-tabs';
import { useMode } from '@/core/context/ModeContext';
import { PenTool, Lightbulb, Archive } from 'lucide-react';
import { Suspense, lazy } from 'react';

// Lazy load component views
const EditorView = lazy(() => import('./components/editor/EditorView'));
const IdeasView = lazy(() => import('./components/ideas/IdeasView'));
const ArchiveView = lazy(() => import('./components/archive/ArchiveView'));

// Loading fallback
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
    </div>
  );
}

export default function WritingView() {
  const { view, setView } = useMode();

  // Map view to tab value
  const currentTab = view === 'editor' ? 'editor' : view === 'ideas' ? 'ideas' : view === 'archive' ? 'archive' : 'editor';

  const handleTabChange = (value: string) => {
    if (value === 'editor' || value === 'ideas' || value === 'archive') {
      setView(value);
    }
  };

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Domain Navigation - Radix Tabs */}
      <Tabs.Root value={currentTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
          <Tabs.List className="flex items-center gap-1 px-4 h-12">
            <Tabs.Trigger
              value="editor"
              className="
                flex items-center gap-2 px-4 py-2 rounded-md
                text-sm font-medium transition-all duration-200
                text-[var(--color-text-soft)]
                hover:text-[var(--color-text-primary)]
                hover:bg-[var(--color-surface-hover)]
                data-[state=active]:text-[var(--color-primary)]
                data-[state=active]:bg-[var(--color-surface-hover)]
                data-[state=active]:font-semibold
                data-[state=active]:shadow-sm
              "
            >
              <PenTool className="h-4 w-4" />
              <span>Editor</span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="ideas"
              className="
                flex items-center gap-2 px-4 py-2 rounded-md
                text-sm font-medium transition-all duration-200
                text-[var(--color-text-soft)]
                hover:text-[var(--color-text-primary)]
                hover:bg-[var(--color-surface-hover)]
                data-[state=active]:text-[var(--color-primary)]
                data-[state=active]:bg-[var(--color-surface-hover)]
                data-[state=active]:font-semibold
                data-[state=active]:shadow-sm
              "
            >
              <Lightbulb className="h-4 w-4" />
              <span>Ideas</span>
            </Tabs.Trigger>

            <Tabs.Trigger
              value="archive"
              className="
                flex items-center gap-2 px-4 py-2 rounded-md
                text-sm font-medium transition-all duration-200
                text-[var(--color-text-soft)]
                hover:text-[var(--color-text-primary)]
                hover:bg-[var(--color-surface-hover)]
                data-[state=active]:text-[var(--color-primary)]
                data-[state=active]:bg-[var(--color-surface-hover)]
                data-[state=active]:font-semibold
                data-[state=active]:shadow-sm
              "
            >
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        {/* Component Views */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Suspense fallback={<ComponentLoader />}>
            <Tabs.Content value="editor" className="h-full data-[state=inactive]:hidden">
              <EditorView />
            </Tabs.Content>

            <Tabs.Content value="ideas" className="h-full data-[state=inactive]:hidden">
              <IdeasView />
            </Tabs.Content>

            <Tabs.Content value="archive" className="h-full data-[state=inactive]:hidden">
              <ArchiveView />
            </Tabs.Content>
          </Suspense>
        </div>
      </Tabs.Root>
    </div>
  );
}
