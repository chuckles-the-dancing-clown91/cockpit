import { Dialog, Tabs, Flex, Text, Button, Badge, Select, TextField, TextArea } from '@radix-ui/themes';
import { X, Save, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Idea, IdeaStatus, IdeaPriority } from '@/shared/types';
import { IDEA_STATUSES, IDEA_PRIORITIES } from '@/shared/constants';
import { useUpdateIdea } from '../hooks/useIdeas';
import { ReferencesPanel } from '@/features/references/components/ReferencesPanel';
import { EntityNotesPanel } from '@/features/notes';
import { useCreateWriting } from '@/features/writing/hooks/useWriting';
import { toast } from '@/core/lib/toast';

interface IdeaDetailDialogProps {
  idea: Idea | null;
  open: boolean;
  onClose: () => void;
  onOpenWriting?: (writingId: number) => void;
}

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

export function IdeaDetailDialog({ idea, open, onClose, onOpenWriting }: IdeaDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<IdeaStatus>('in_progress');
  const [priority, setPriority] = useState<IdeaPriority>('medium');
  const [target, setTarget] = useState('');
  const updateIdea = useUpdateIdea();
  const createWriting = useCreateWriting();
  
  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setSummary(idea.summary || '');
      setStatus(idea.status);
      setPriority(idea.priority);
      setTarget(idea.target || '');
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
  
  const detailsChanged =
    title !== idea.title ||
    summary !== (idea.summary || '') ||
    status !== idea.status ||
    priority !== idea.priority ||
    target !== (idea.target || '');
  const handleCreateArticle = async () => {
    try {
      const writing = await createWriting.mutateAsync({
        title: idea.title,
        writingType: 'article',
        linkIdeaIds: [idea.id],
        initialContentJson: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: idea.title }],
            },
            {
              type: 'paragraph',
              content: idea.summary 
                ? [{ type: 'text', text: idea.summary }]
                : undefined,
            },
            { type: 'paragraph' },
          ],
        },
      });
      
      toast.success('Article created from idea');
      onClose();
      
      if (onOpenWriting) {
        onOpenWriting(writing.id);
      }
    } catch (error) {
      toast.error('Failed to create article');
      console.error('Error creating article:', error);
    }
  };
  
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content maxWidth="900px" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <Flex direction="column" gap="2" mb="4" pb="4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <Flex justify="between" align="start">
            <Dialog.Title>
              <Text size="5" weight="bold">{idea.title}</Text>
            </Dialog.Title>
            <Flex gap="2">
              <Button 
                variant="soft" 
                size="2"
                onClick={handleCreateArticle}
                disabled={createWriting.isPending}
              >
                <BookOpen className="w-4 h-4" />
                {createWriting.isPending ? 'Creating...' : 'Create Article'}
              </Button>
              <Dialog.Close>
                <Button variant="ghost" size="2"><X className="w-5 h-5" /></Button>
              </Dialog.Close>
            </Flex>
          </Flex>
          <Dialog.Description>Edit idea details, notes, and references</Dialog.Description>
          <Flex gap="2" align="center">
            <Badge color={STATUS_COLORS[idea.status]}>
              {IDEA_STATUSES.find(o => o.value === idea.status)?.label}
            </Badge>
            <Badge color={PRIORITY_COLORS[idea.priority]} variant="soft">{idea.priority.toUpperCase()}</Badge>
            <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
              Added {new Date(idea.dateAdded).toLocaleDateString()}
            </Text>
          </Flex>
        </Flex>
        
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Tabs.List mb="3">
            <Tabs.Trigger value="details">Details</Tabs.Trigger>
            <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
            <Tabs.Trigger value="references">References</Tabs.Trigger>
          </Tabs.List>
          
          <Flex direction="column" style={{ flex: 1, overflow: 'auto' }}>
            <Tabs.Content value="details">
              <Flex direction="column" gap="4">
                <label>
                  <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>Title *</Text>
                  <TextField.Root value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the big idea?" />
                </label>
                
                <label>
                  <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>Summary</Text>
                  <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief description of this idea" rows={3} />
                </label>
                
                <Flex gap="4">
                  <label style={{ flex: 1 }}>
                    <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>Status</Text>
                    <Select.Root value={status} onValueChange={(v) => setStatus(v as IdeaStatus)}>
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content>
                        {IDEA_STATUSES.map((opt) => (<Select.Item key={opt.value} value={opt.value}>{opt.label}</Select.Item>))}
                      </Select.Content>
                    </Select.Root>
                  </label>
                  
                  <label style={{ flex: 1 }}>
                    <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>Priority</Text>
                    <Select.Root value={priority} onValueChange={(v) => setPriority(v as IdeaPriority)}>
                      <Select.Trigger style={{ width: '100%' }} />
                      <Select.Content>
                        {IDEA_PRIORITIES.map((opt) => (<Select.Item key={opt.value} value={opt.value}>{opt.label}</Select.Item>))}
                      </Select.Content>
                    </Select.Root>
                  </label>
                </Flex>
                
                <label>
                  <Text size="2" weight="medium" style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>Target (optional)</Text>
                  <TextField.Root value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g., blog post, novel, article" />
                </label>
                
                <Flex justify="end" gap="2" pt="2">
                  <Button onClick={handleSaveDetails} disabled={!detailsChanged || !title.trim() || updateIdea.isPending}>
                    <Save className="w-4 h-4" />
                    {updateIdea.isPending ? 'Saving...' : 'Save Details'}
                  </Button>
                </Flex>
              </Flex>
            </Tabs.Content>
            
            <Tabs.Content value="notes">
              <EntityNotesPanel entityType="idea" entityId={idea.id} title="Idea Notes" placeholder="Write your thoughts, research, outlines..." />
            </Tabs.Content>
            
            <Tabs.Content value="references">
              <ReferencesPanel ideaId={idea.id} />
            </Tabs.Content>
          </Flex>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
