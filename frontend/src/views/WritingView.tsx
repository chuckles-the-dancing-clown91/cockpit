import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { ScrollArea } from '../components/ui/ScrollArea';
import { useArticleIdeas } from '../hooks/queries';

export function WritingView() {
  const { data: ideas } = useArticleIdeas();

  return (
    <div className="grid grid-cols-3 gap-3 p-3 h-full">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ideas</h3>
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]">New</Button>
        </div>
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 pr-1">
            {ideas?.map((idea) => (
              <div key={idea.id} className="p-3 rounded-[var(--radius-button)] bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]">
                <div className="font-semibold">{idea.title}</div>
                {idea.notes ? <div className="text-xs text-[var(--color-text-soft)]">{idea.notes}</div> : null}
              </div>
            )) || <div className="text-[var(--color-text-muted)]">No ideas yet.</div>}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Composer</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="border border-[var(--color-border)]">Schedule</Button>
            <Button size="sm">Publish</Button>
          </div>
        </div>
        <Input placeholder="Draft title" />
        <Textarea className="min-h-[260px]" placeholder="Draft body" />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Target (e.g., r/...)" />
          <Input placeholder="Tags" />
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Reference</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Pin snippets, URLs, or recent feed items here.</p>
        <div className="grid gap-2">
          <div className="p-3 rounded-[var(--radius-button)] bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)]">
            <div className="text-sm text-[var(--color-text-primary)]">No references pinned yet.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
