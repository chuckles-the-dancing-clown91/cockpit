import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/core/components/ui/Button';
import { Card } from '@/core/components/ui/Card';
import { ScrollArea } from '@/core/components/ui/ScrollArea';
import {
  useArticleIdeas,
  useMixedFeed,
  useScheduledJobs,
  useSystemUser,
  useUpcomingEvents,
  useNewsArticles,
  type ArticleIdea,
  type FeedItem,
  type CalendarEvent,
  type Job,
} from '../hooks/queries';
import { NewsFeedDialog } from '@/research/components/news-feed/NewsFeedDialog';

export default function NewsFeedView() {
  const { data: systemUser, isLoading: userLoading } = useSystemUser();
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
    isFetching: eventsFetching,
  } = useUpcomingEvents();
  const {
    data: feed,
    isLoading: feedLoading,
    refetch: refetchFeed,
    isFetching: feedFetching,
  } = useMixedFeed();
  const { data: ideas, isLoading: ideasLoading } = useArticleIdeas({ status: 'inbox' });
  const { data: jobs, isLoading: jobsLoading } = useScheduledJobs();
  const { data: newsArticles } = useNewsArticles({ status: 'unread', limit: 50 });
  const [syncing, setSyncing] = useState(false);

  const stats = useMemo(
    () => ({
      events: events?.length ?? 0,
      feed: feed?.length ?? 0,
      ideas: ideas?.length ?? 0,
      jobs: jobs?.length ?? 0,
      news: newsArticles?.length ?? 0,
    }),
    [events, feed, ideas, jobs, newsArticles]
  );

  async function handleCalendarSync() {
    setSyncing(true);
    try {
      await invoke('sync_calendar');
      await refetchEvents();
    } catch (err) {
      console.error('Failed to sync calendar', err);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <WelcomeBanner
        user={systemUser ?? 'Pilot'}
        loading={userLoading}
        stats={stats}
        syncing={syncing || eventsFetching}
        onSyncCalendar={handleCalendarSync}
      />
      <div className="min-h-[180px]">
        <CalendarPanel
          events={events ?? []}
          loading={eventsLoading || syncing}
          onSync={handleCalendarSync}
          syncing={syncing || eventsFetching}
        />
      </div>
      <div className="flex-1 grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] gap-3 min-h-0">
        <FeedPanel items={feed ?? []} loading={feedLoading} refreshing={feedFetching} onRefresh={refetchFeed} />
        <div className="flex flex-col gap-3 min-h-0">
          <IdeasPanel ideas={ideas ?? []} loading={ideasLoading} />
          <AlertsPanel jobs={jobs ?? []} loading={jobsLoading} />
          <NewsFeedDialog trigger={<Button variant="subtle" size="sm">News feed ({stats.news})</Button>} />
        </div>
      </div>
    </div>
  );
}

function WelcomeBanner({
  user,
  loading,
  stats,
  syncing,
  onSyncCalendar,
}: {
  user: string;
  loading?: boolean;
  stats: { events: number; feed: number; ideas: number; jobs: number; news: number };
  syncing?: boolean;
  onSyncCalendar: () => void;
}) {
  return (
    <Card className="overflow-hidden relative">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[var(--color-text-muted)]">Welcome back</p>
          <h2 className="text-2xl font-semibold">{loading ? 'Calibrating…' : user}</h2>
          <p className="text-sm text-[var(--color-text-soft)]">
            Systems are nominal. Your console is synced across feeds, calendar, and ideas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="solid">Launch cockpit</Button>
          <Button variant="ghost" className="border border-[var(--color-border)]" onClick={onSyncCalendar} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync calendar'}
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-3 text-sm">
        <StatPill label="Events" value={stats.events} />
        <StatPill label="Feed items" value={stats.feed} />
        <StatPill label="Ideas" value={stats.ideas} />
        <StatPill label="Alerts" value={stats.jobs} />
        <NewsFeedDialog
          trigger={
            <button className="text-left w-full">
              <StatPill label="News" value={stats.news} />
            </button>
          }
        />
      </div>
    </Card>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] px-3 py-2">
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="text-lg font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function CalendarPanel({
  events,
  loading,
  onSync,
  syncing,
}: {
  events: CalendarEvent[];
  loading?: boolean;
  onSync: () => void;
  syncing?: boolean;
}) {
  const nextThree = events.slice(0, 3);
  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Upcoming</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={onSync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync'}
          </Button>
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]">
            View calendar
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-3 text-sm">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] p-3 animate-pulse h-[96px]"
            />
          ))}
        </div>
      ) : nextThree.length ? (
        <div className="grid grid-cols-3 gap-3 text-sm">
          {nextThree.map((evt) => (
            <div key={evt.id} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] p-3">
              <div className="text-xs text-[var(--color-text-muted)]">
                {new Date(evt.startTime).toLocaleString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="font-semibold text-[var(--color-text-primary)]">{evt.title}</div>
              {evt.location ? <div className="text-xs text-[var(--color-text-soft)]">{evt.location}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[var(--color-text-muted)]">No events scheduled.</div>
      )}
    </Card>
  );
}

function FeedPanel({
  items,
  loading,
  refreshing,
  onRefresh,
}: {
  items: FeedItem[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card className="h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Mixed Feed</h3>
        <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-3 pr-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] p-3 animate-pulse h-[96px]"
              />
            ))
          ) : items.length ? (
            items.map((item) => (
              <div key={item.id} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] p-3">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span className="uppercase tracking-wide">{item.provider}</span>
                  <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-[var(--color-text-primary)] font-semibold">{item.title}</div>
                {item.summary ? <p className="text-[var(--color-text-soft)] text-sm mt-1">{item.summary}</p> : null}
              </div>
            ))
          ) : (
            <div className="text-[var(--color-text-muted)]">No feed data yet.</div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

function IdeasPanel({ ideas, loading }: { ideas: ArticleIdea[]; loading?: boolean }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ideas Inbox</h3>
        <Button variant="ghost" size="sm" className="border border-[var(--color-border)]">Add</Button>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3 rounded-[var(--radius-button)] bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] animate-pulse h-[70px]"
            />
          ))
        ) : ideas.length ? (
          ideas.map((idea) => {
            const summary = idea.summary || idea.notesMarkdown || idea.articleTitle;
            return (
              <div
                key={idea.id}
                className="p-3 rounded-[var(--radius-button)] bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-[var(--color-text-primary)]">{idea.title}</div>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--color-surface-strong)] text-[var(--color-text-soft)] capitalize">
                    {idea.status.replace('_', ' ')}
                  </span>
                </div>
                {summary ? <div className="text-[var(--color-text-soft)] text-xs mt-1">{summary}</div> : null}
              </div>
            );
          })
        ) : (
          <div className="text-[var(--color-text-muted)]">No ideas yet.</div>
        )}
      </div>
    </Card>
  );
}

function AlertsPanel({ jobs, loading }: { jobs: Job[]; loading?: boolean }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Alerts</h3>
        <Button variant="ghost" size="sm" className="border border-[var(--color-border)]">View all</Button>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3 rounded-[var(--radius-button)] bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] animate-pulse h-[64px]"
            />
          ))
        ) : jobs.length ? (
          jobs.map((job) => (
            <div key={job.id} className="p-3 rounded-[var(--radius-button)] bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]">
              <div className="font-semibold text-[var(--color-text-primary)]">{job.job_type}</div>
              <div className="text-[var(--color-text-soft)] text-xs">{job.status}</div>
              {job.run_at ? <div className="text-[var(--color-text-muted)] text-xs">Next: {new Date(job.run_at).toLocaleString()}</div> : null}
            </div>
          ))
        ) : (
          <div className="text-[var(--color-text-muted)]">No jobs scheduled.</div>
        )}
      </div>
    </Card>
  );
}
