import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './core/providers/ThemeProvider';
import { AppShell } from './core/components/layout/AppShell';
import { WritingView } from './domains/writing/WritingView';
import { IdeasView } from './domains/writing/IdeasView';
import { ResearchView } from './domains/research/ResearchView';
import { SystemView } from './domains/system/SystemView';
import { Settings } from './domains/system/Settings';
import { Storage } from './domains/system/Storage';
import { Logs } from './domains/system/Logs';
import { Tasks } from './domains/system/Tasks';
import { ComingSoonPage } from './core/components/ui/ComingSoonPage';
import { Toaster } from './core/components/ui/Toaster';
import { DialogProvider } from './core/providers/DialogProvider';
import { ErrorBoundary } from './core/components/ErrorBoundary';

// Configure TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 404s or other client errors
        if (error instanceof Error && error.message.includes('404')) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <DialogProvider>
            <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            {/* Redirect root to writing */}
            <Route index element={<Navigate to="/writing" replace />} />

            {/* Writing Domain */}
            <Route path="writing" element={<WritingView />}>
              <Route index element={<Navigate to="/writing/ideas" replace />} />
              <Route path="editor" element={<ComingSoonPage title="Editor" description="Write and edit your articles" />} />
              <Route path="ideas" element={<IdeasView />} />
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
              <Route path="settings" element={<Settings />} />
              <Route path="storage" element={<Storage />} />
              <Route path="logs" element={<Logs />} />
              <Route path="tasks" element={<Tasks />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/writing" replace />} />
          </Route>
        </Routes>
            </BrowserRouter>
            <Toaster />
          </DialogProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
