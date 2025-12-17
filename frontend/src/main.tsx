import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './core/providers/ThemeProvider';
import { AppShell } from './core/components/layout/AppShell';
import { WritingView } from './domains/writing/WritingView';
import { ResearchView } from './domains/research/ResearchView';
import { SystemView } from './domains/system/SystemView';
import { ComingSoonPage } from './core/components/ui/ComingSoonPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            {/* Redirect root to writing */}
            <Route index element={<Navigate to="/writing" replace />} />

            {/* Writing Domain */}
            <Route path="writing" element={<WritingView />}>
              <Route index element={<Navigate to="/writing/editor" replace />} />
              <Route path="editor" element={<ComingSoonPage title="Editor" description="Write and edit your articles" />} />
              <Route path="ideas" element={<ComingSoonPage title="Ideas Library" description="Manage your writing ideas" />} />
              <Route path="archive" element={<ComingSoonPage title="Archive" description="View archived ideas" />} />
            </Route>

            {/* Research Domain */}
            <Route path="research" element={<ResearchView />}>
              <Route index element={<Navigate to="/research/stream" replace />} />
              <Route path="stream" element={<ComingSoonPage title="Stream" description="View all articles in your feed" />} />
              <Route path="sources" element={<ComingSoonPage title="Feed Sources" description="Manage your news sources" />} />
              <Route path="news" element={<ComingSoonPage title="News Feed" description="Browse latest news" />} />
            </Route>

            {/* System Domain */}
            <Route path="system" element={<SystemView />}>
              <Route index element={<Navigate to="/system/settings" replace />} />
              <Route path="settings" element={<ComingSoonPage title="Settings" description="Configure your app" />} />
              <Route path="storage" element={<ComingSoonPage title="Storage" description="Manage database and backups" />} />
              <Route path="logs" element={<ComingSoonPage title="Logs" description="View application logs" />} />
              <Route path="tasks" element={<ComingSoonPage title="Tasks" description="Manage scheduled tasks" />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/writing" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
