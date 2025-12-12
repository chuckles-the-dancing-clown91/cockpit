import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ScrollArea } from '../ui/ScrollArea';
import { Input } from '../ui/Input';

// Mock data - will be replaced with real backend integration
const mockSources = [
  { id: 1, name: 'TechCrunch', url: 'https://techcrunch.com/feed', enabled: true, category: 'Technology' },
  { id: 2, name: 'Hacker News', url: 'https://news.ycombinator.com/rss', enabled: true, category: 'Technology' },
  { id: 3, name: 'The Verge', url: 'https://www.theverge.com/rss', enabled: false, category: 'Technology' },
  { id: 4, name: 'Wired', url: 'https://wired.com/feed', enabled: true, category: 'Technology' },
];

export function SourcesView() {
  const [sources, setSources] = useState(mockSources);
  const [search, setSearch] = useState('');

  const filteredSources = sources.filter(
    (source) =>
      source.name.toLowerCase().includes(search.toLowerCase()) ||
      source.url.toLowerCase().includes(search.toLowerCase()) ||
      source.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSource = (id: number) => {
    setSources(sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      <Card className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">News Sources</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button variant="solid" size="sm">
            Add Source
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-[1fr_400px] gap-3 h-full min-h-0">
        <Card className="flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Active Sources ({filteredSources.filter((s) => s.enabled).length}/{filteredSources.length})
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="border border-[var(--color-border)]">
                Refresh All
              </Button>
              <Button variant="ghost" size="sm" className="border border-[var(--color-border)]">
                Import
              </Button>
            </div>
          </div>
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 pr-1">
              {filteredSources.length ? (
                filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-[var(--color-text-primary)]">{source.name}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-soft)]">
                          {source.category}
                        </span>
                        {source.enabled && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] truncate">{source.url}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant={source.enabled ? 'ghost' : 'solid'}
                        size="sm"
                        onClick={() => toggleSource(source.id)}
                      >
                        {source.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="ghost" size="sm" className="border border-[var(--color-border)]">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[var(--color-text-muted)]">No sources found.</div>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">Source Stats</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]">
              <div className="text-xs text-[var(--color-text-muted)]">Total Sources</div>
              <div className="text-2xl font-semibold text-[var(--color-text-primary)]">{sources.length}</div>
            </div>
            <div className="p-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]">
              <div className="text-xs text-[var(--color-text-muted)]">Active Sources</div>
              <div className="text-2xl font-semibold text-[var(--color-accent)]">
                {sources.filter((s) => s.enabled).length}
              </div>
            </div>
            <div className="p-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]">
              <div className="text-xs text-[var(--color-text-muted)]">Articles Today</div>
              <div className="text-2xl font-semibold text-[var(--color-text-primary)]">142</div>
            </div>
            <div className="p-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]">
              <div className="text-xs text-[var(--color-text-muted)]">Last Updated</div>
              <div className="text-sm text-[var(--color-text-soft)]">5 minutes ago</div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Quick Actions</h4>
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" className="border border-[var(--color-border)] justify-start">
                Enable All Sources
              </Button>
              <Button variant="ghost" size="sm" className="border border-[var(--color-border)] justify-start">
                Disable All Sources
              </Button>
              <Button variant="ghost" size="sm" className="border border-[var(--color-border)] justify-start">
                Export Source List
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
