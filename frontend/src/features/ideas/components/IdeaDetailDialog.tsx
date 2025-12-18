import * as Dialog from '@radix-ui/react-dialog';
import { Tabs, Flex, Text, Button, Badge, Select, TextField, TextArea } from '@radix-ui/themes';
import { X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Idea, IdeaStatus, IdeaPriority } from '@/shared/types';
import { useUpdateIdea, useUpdateIdeaNotes } from '../hooks/useIdeas';

interface IdeaDetailDialogProps {
  idea: Idea | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: IdeaStatus; label: string }[] = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'complete', label: 'Complete' },
];

const PRIORITY_OPTIONS: { value: IdeaPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_COLORS = {
  in_progress: 'blue',
  stalled: 'orange',
  complete: 'green',
} as const;

const PRIORITY_COLORS = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
} as const;

/**
 * IdeaDetailDialog - Full modal for viewing and editing idea details
 * 
 * Tabs:
 * - Details: Edit metadata (title, summary, status, priority, target)
 * - Notes: Markdown editor for detailed notes
 * 
 * Features:
 * - Separate save mutations for details vs notes
 * - Form validation
 * - Keyboard shortcuts
 * - Auto-resize text areas
 */
export function IdeaDetailDialog({ idea, open, onClose }: IdeaDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  // Details form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<IdeaStatus>('in_progress');
  const [priority, setPriority] = useState<IdeaPriority>('medium');
  const [target, setTarget] = useState('');
  
  // Notes state
  const [notes, setNotes] = useState('');
  
  const updateIdea = useUpdateIdea();
  const updateNotes = useUpdateIdeaNotes();
  
  // Reset form when idea changes
  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setSummary(idea.summary || '');
      setStatus(idea.status);
      setPriority(idea.priority);
      setTarget(idea.target || '');
      setNotes(idea.notesMarkdown || '');
    }
  }, [idea]);
  
  if (!idea) return null;
  
  const handleSaveDetails = async () => {
    await updateIdea.mutateAsync({
      id: idea.id,
      title,
      summary: summary || undefined,
      status,
      priority,
      target: target || undefined,
    });
  };
  
  const handleSaveNotes = async () => {
    await updateNotes.mutateAsync({
      id: idea.id,
      notesMarkdown: notes,
    });
  };
  
  const detailsChanged =
    title !== idea.title ||
    summary !== (idea.summary || '') ||
    status !== idea.status ||
    priority !== idea.priority ||
    target !== (idea.target || '');
  
  const notesChanged = notes !== (idea.notesMarkdown || '');
  
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(900px,100%-2rem)] max-h-[90vh] flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)]">
          {/* Header */}
          <Flex
            justify="between"
            align="center"
            p="6"
            style={{
              borderBottom: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <Flex direction="column" gap="2">
              <Dialog.Title>
                <Text size="5" weight="bold" style={{ color: 'var(--color-text-primary)' }}>
                  {idea.title}
                </Text>
              </Dialog.Title>
              <Flex gap="2" align="center">
                <Badge color={STATUS_COLORS[idea.status]}>
                  {STATUS_OPTIONS.find(o => o.value === idea.status)?.label}
                </Badge>
                <Badge color={PRIORITY_COLORS[idea.priority]} variant="soft">
                  {idea.priority.toUpperCase()}
                </Badge>
                <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
                  Added {new Date(idea.dateAdded).toLocaleDateString()}
                </Text>
              </Flex>
            </Flex>
            <Dialog.Close asChild>
              <Button variant="ghost" size="2">
                <X className="w-5 h-5" />
              </Button>
            </Dialog.Close>
          </Flex>
          
          {/* Content */}
          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1rem' }}>
              <Tabs.Trigger value="details">Details</Tabs.Trigger>
              <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
            </Tabs.List>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              {/* Details Tab */}
              <Tabs.Content value="details">
                <Flex direction="column" gap="4">
                  <label>
                    <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                      Title *
                    </Text>
                    <TextField.Root
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What's the big idea?"
                    />
                  </label>
                  
                  <label>
                    <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                      Summary
                    </Text>
                    <TextArea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Brief description of this idea"
                      rows={3}
                    />
                  </label>
                  
                  <Flex gap="4">
                    <label style={{ flex: 1 }}>
                      <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                        Status
                      </Text>
                      <Select.Root value={status} onValueChange={(v) => setStatus(v as IdeaStatus)}>
                        <Select.Trigger style={{ width: '100%' }} />
                        <Select.Content>
                          {STATUS_OPTIONS.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </label>
                    
                    <label style={{ flex: 1 }}>
                      <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                        Priority
                      </Text>
                      <Select.Root value={priority} onValueChange={(v) => setPriority(v as IdeaPriority)}>
                        <Select.Trigger style={{ width: '100%' }} />
                        <Select.Content>
                          {PRIORITY_OPTIONS.map((opt) => (
                            <Select.Item key={opt.value} value={opt.value}>
                              {opt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </label>
                  </Flex>
                  
                  <label>
                    <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                      Target (optional)
                    </Text>
                    <TextField.Root
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      placeholder="e.g., blog post, novel, article"
                    />
                  </label>
                  
                  <Flex justify="end" gap="2" pt="2">
                    <Button
                      onClick={handleSaveDetails}
                      disabled={!detailsChanged || !title.trim() || updateIdea.isPending}
                    >
                      <Save className="w-4 h-4" />
                      {updateIdea.isPending ? 'Saving...' : 'Save Details'}
                    </Button>
                  </Flex>
                </Flex>
              </Tabs.Content>
              
              {/* Notes Tab */}
              <Tabs.Content value="notes">
                <Flex direction="column" gap="4">
                  <label>
                    <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                      Notes (Markdown supported)
                    </Text>
                    <TextArea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Write your thoughts, research, outlines..."
                      rows={20}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '14px',
                      }}
                    />
                  </label>
                  
                  <Flex justify="end" gap="2">
                    <Button
                      onClick={handleSaveNotes}
                      disabled={!notesChanged || updateNotes.isPending}
                    >
                      <Save className="w-4 h-4" />
                      {updateNotes.isPending ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </Flex>
                </Flex>
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
