import { useState } from 'react';
import { NavBar, type ViewId } from './components/layout/NavBar';
import { DashboardView } from './views/DashboardView';
import { WritingView } from './views/WritingView';
import { RedditView } from './views/RedditView';
import { CalendarView } from './views/CalendarView';
import { FilesView } from './views/FilesView';

function App() {
  const [view, setView] = useState<ViewId>('dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <NavBar view={view} onChangeView={setView} />
      <main className="flex-1 overflow-auto">
        {view === 'dashboard' && <DashboardView />}
        {view === 'writing' && <WritingView />}
        {view === 'reddit' && <RedditView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'files' && <FilesView />}
      </main>
    </div>
  );
}

export default App;
