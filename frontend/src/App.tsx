import { ModeProvider, useMode } from './components/navigation/ModeContext';
import { TopNav } from './components/navigation/TopNav';
import { SideNav } from './components/navigation/SideNav';
import { WritingView } from './views/WritingView';
import { IdeasLibraryView } from './components/writing/IdeasLibraryView';
import { ArchiveView } from './components/writing/ArchiveView';
import { NewsFeedView } from './components/research/NewsFeedView';
import { RedditView } from './components/research/RedditView';
import { SourcesView } from './components/research/SourcesView';
import { SettingsView } from './components/system/SettingsView';
import { StorageView } from './components/system/StorageView';
import { LogsView } from './components/system/LogsView';
import { TasksView } from './components/system/TasksView';

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
        <main 
          className="flex-1 overflow-auto transition-all duration-300"
          role="main"
          aria-label="Main content"
        >
          <div className="animate-fade-in">
            {renderView()}
          </div>
        </main>
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
