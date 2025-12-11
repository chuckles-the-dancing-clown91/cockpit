import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { ScrollArea } from '../components/ui/ScrollArea';
import { useUpcomingEvents } from '../hooks/queries';

export function CalendarView() {
  const { data: events } = useUpcomingEvents(1440);
  const [mode, setMode] = useState<'month' | 'week' | 'agenda'>('month');

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      <Card className="flex items-center gap-3">
        <Button variant="subtle" size="sm">Today</Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">Prev</Button>
          <Button size="sm" variant="outline">Next</Button>
        </div>
        <div className="text-lg font-semibold">December 2025</div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <Button size="sm" variant="solid">Sync Now</Button>
      </Card>

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3 h-full min-h-0">
        <Card className="min-h-[400px]">
          <h3 className="text-lg font-semibold mb-3">Calendar Grid ({mode})</h3>
          <div className="grid grid-cols-7 gap-2 text-xs text-[var(--color-text-muted)]">
            {Array.from({ length: 28 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[4/3] rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)] p-2"
              >
                <div className="text-[var(--color-text-soft)]">{idx + 1}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Events</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">Delete selected</Button>
              <Button size="sm" variant="ghost" className="border border-[var(--color-border)]">Ignore selected</Button>
            </div>
          </div>
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 pr-1 text-sm">
              {events?.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-[var(--radius-button)] bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]"
                >
                  <div className="text-xs text-[var(--color-text-muted)]">{new Date(evt.startTime).toLocaleString()}</div>
                  <div className="font-semibold text-[var(--color-text-primary)]">{evt.title}</div>
                  {evt.location ? <div className="text-[var(--color-text-soft)] text-xs">{evt.location}</div> : null}
                </div>
              )) || <div className="text-[var(--color-text-muted)]">No events synced.</div>}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
