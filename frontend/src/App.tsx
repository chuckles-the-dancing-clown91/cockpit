import { lazy, Suspense } from 'react';
import { ModeProvider, useMode } from './components/navigation/ModeContext';
import { TopNav } from './components/navigation/TopNav';
import { SideNav } from './components/navigation/SideNav';
import { useSetupStatus } from './hooks/queries';
import { Loader2 } from 'lucide-react';

// Lazy load views for code splitting
const WritingView = lazy(() => import('./views/WritingView'));
const IdeasLibraryView = lazy(() => import('./components/writing/IdeasLibraryView'));
const ArchiveView = lazy(() => import('./components/writing/ArchiveView'));
const NewsFeedView = lazy(() => import('./components/research/NewsFeedView'));
const FeedSourcesView = lazy(() => import('./views/FeedSourcesView'));
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
      if (view === 'feed-sources') return <FeedSourcesView />;
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
  const { data: setupStatus, isLoading } = useSetupStatus();

  // Show loading/setup spinner
  if (isLoading || !setupStatus?.is_complete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {isLoading ? 'Loading Cockpit...' : 'Setting up Cockpit...'}
            </h2>
            <p className="text-slate-400">
              {!setupStatus?.has_master_key && 'Initializing encryption...'}
              {!setupStatus?.has_database && !isLoading && 'Creating database...'}
              {setupStatus?.has_master_key && setupStatus?.has_database && !setupStatus?.is_complete && 'Finalizing setup...'}
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show main app when setup is complete
  return (
    <ModeProvider>
      <AppContent />
    </ModeProvider>
  );
}

export default App;
