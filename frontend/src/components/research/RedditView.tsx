import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { ScrollArea } from '../ui/ScrollArea';
import { Input } from '../ui/Input';

const mockItems = [
  {
    id: '1',
    title: 'Need approval: Post about launch',
    author: 'u/opsbot',
    status: 'queue',
    body: 'Can we approve the new launch summary?',
  },
  {
    id: '2',
    title: 'User report: spam content',
    author: 'u/observer',
    status: 'posts',
    body: 'Looks like bot spam in comments.',
  },
];

export default function RedditView() {
  const [tab, setTab] = useState<'posts' | 'queue' | 'messages' | 'stats'>('posts');
  const [selectedId, setSelectedId] = useState<string | null>(mockItems[0]?.id ?? null);
  const selected = useMemo(() => mockItems.find((i) => i.id === selectedId), [selectedId]);

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      <Card className="flex items-center gap-3">
        <Select defaultValue="r/EndgameOrRepair">
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="r/EndgameOrRepair">r/EndgameOrRepair</SelectItem>
            <SelectItem value="r/Architects">r/Architects</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <Button variant="solid" size="sm">New Post</Button>
      </Card>

      <div className="grid grid-cols-2 gap-3 h-full min-h-0">
        <Card className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold capitalize">{tab}</h3>
            <Input placeholder="Search" className="w-40" />
          </div>
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 pr-1">
              {mockItems
                .filter((item) => (tab === 'queue' ? item.status === 'queue' : true))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`text-left p-3 rounded-[var(--radius-card)] border ${
                      selectedId === item.id ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]'
                    }`}
                  >
                    <div className="text-sm text-[var(--color-text-muted)]">{item.author}</div>
                    <div className="text-[var(--color-text-primary)] font-semibold">{item.title}</div>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Details</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="border border-[var(--color-border)]">Approve</Button>
              <Button size="sm" variant="danger">Remove</Button>
              <Button size="sm" variant="outline">Lock</Button>
            </div>
          </div>
          {selected ? (
            <div className="space-y-2">
              <div className="text-xs text-[var(--color-text-muted)]">{selected.author}</div>
              <div className="text-xl font-semibold">{selected.title}</div>
              <p className="text-sm text-[var(--color-text-soft)]">{selected.body}</p>
            </div>
          ) : (
            <div className="text-[var(--color-text-muted)]">Select an item to inspect.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
