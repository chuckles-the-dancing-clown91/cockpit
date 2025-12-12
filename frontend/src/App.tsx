import { lazy, Suspense } from 'react';
import { ModeProvider, useMode } from './components/navigation/ModeContext';
import { TopNav } from './components/navigation/TopNav';
import { SideNav } from './components/navigation/SideNav';

// Lazy load views for code splitting
const WritingView = lazy(() => import('./views/WritingView'));
const IdeasLibraryView = lazy(() => import('./components/writing/IdeasLibraryView'));
const ArchiveView = lazy(() => import('./components/writing/ArchiveView'));
const NewsFeedView = lazy(() => import('./components/research/NewsFeedView'));
const RedditView = lazy(() => import('./components/research/RedditView'));
const SourcesView = lazy(() => import('./components/research/SourcesView'));
const SettingsView = lazy(() => import('./components/system/SettingsView'));
const StorageView = lazy(() => import('./components/system/StorageView'));
const LogsView = lazy(() => import('./components/system/LogsView'));
const TasksView = lazy(() => import('./components/system/TasksView'));

// Loading fallback component
function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function AppContent() {
  const { mode, view } = useMode();

  // Render the appropriate view based on mode and view
  const renderView = () => {
    // Writing mode views
    if (mode === 'writing') {
      if (view === 'editor') return <WritingView />;
      if (view === 'ideas') return <IdeasLibraryView />;
      if (view === 'archive') return <ArchiveView />;
    }

    // Research mode views
    if (mode === 'research') {
      if (view === 'news') return <NewsFeedView />;
      if (view === 'reddit') return <RedditView />;
      if (view === 'sources') return <SourcesView />;
    }

    // System mode views
    if (mode === 'system') {
      if (view === 'settings') return <SettingsView />;
      if (view === 'storage') return <StorageView />;
      if (view === 'logs') return <LogsView />;
      if (view === 'tasks') return <TasksView />;
    }

    return <div className="p-6">View not found</div>;
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopNav />
      <div className="flex flex-1 overflow-hidden relative">
        <SideNav />
        <Suspense fallback={<ViewLoader />}>
          <main 
          className="flex-1 overflow-auto transition-all duration-300"
          role="main"
          aria-label="Main content"
        >
          <div className="animate-fade-in">
            {renderView()}
          </div>
          </main>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <ModeProvider>
      <AppContent />
    </ModeProvider>
  );
}

export default App;
