import { useState } from 'react';
import { Dialog, Flex, Text, Button, TextField, TextArea } from '@radix-ui/themes';
import { Link as LinkIcon, Plus, Search } from 'lucide-react';
import { useIdeas, useCreateIdea } from '@/features/ideas/hooks/useIdeas';
import { useLinkIdea } from '../../hooks/useWriting';
import { toast } from '@/core/lib/toast';
import { LoadingInline } from '@/core/components/ui';
import type { Idea, IdeaStatus } from '@/shared/types';

interface LinkIdeaDialogProps {
  writingId: number;
  open: boolean;
  onClose: () => void;
}

/**
 * LinkIdeaDialog - Modal for linking or creating ideas
 * 
 * Features:
 * - Tab 1: Link existing idea (search and select)
 * - Tab 2: Create new idea and auto-link
 */
export function LinkIdeaDialog({ writingId, open, onClose }: LinkIdeaDialogProps) {
  const [view, setView] = useState<'link' | 'create'>('link');
  
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>Link Idea to Writing</Dialog.Title>
        <Dialog.Description size="2" mb="4" style={{ color: 'var(--color-text-soft)' }}>
          {view === 'link' ? 'Select an existing idea to link' : 'Create a new idea and link it'}
        </Dialog.Description>

        {/* Tab Switcher */}
        <Flex gap="2" mb="4">
          <Button
            variant={view === 'link' ? 'solid' : 'soft'}
            onClick={() => setView('link')}
            style={{ flex: 1 }}
          >
            <LinkIcon size={16} />
            Link Existing
          </Button>
          <Button
            variant={view === 'create' ? 'solid' : 'soft'}
            onClick={() => setView('create')}
            style={{ flex: 1 }}
          >
            <Plus size={16} />
            Create New
          </Button>
        </Flex>

        {view === 'link' ? (
          <ExistingIdeasTab writingId={writingId} onSuccess={onClose} />
        ) : (
          <NewIdeaTab writingId={writingId} onSuccess={onClose} />
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * ExistingIdeasTab - Search and link existing ideas
 */
function ExistingIdeasTab({ writingId, onSuccess }: { writingId: number; onSuccess: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: ideas, isLoading } = useIdeas();
  const linkIdea = useLinkIdea(writingId);

  const filteredIdeas = ideas?.filter(idea => 
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (idea.summary && idea.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleLinkIdea = async (ideaId: number) => {
    try {
      await linkIdea.mutateAsync(ideaId);
      toast.success('Idea linked successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to link idea:', error);
      toast.error('Failed to link idea');
    }
  };

  return (
    <Flex direction="column" gap="4">
      <TextField.Root
        placeholder="Search ideas..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      >
        <TextField.Slot>
          <Search size={16} />
        </TextField.Slot>
      </TextField.Root>

      {isLoading ? (
        <LoadingInline message="Loading ideas..." />
      ) : filteredIdeas.length > 0 ? (
        <Flex direction="column" gap="2" style={{ maxHeight: '400px', overflow: 'auto' }}>
          {filteredIdeas.map((idea) => (
            <Flex
              key={idea.id}
              p="3"
              gap="3"
              align="center"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-2)',
                backgroundColor: 'var(--color-surface)',
                cursor: linkIdea.isPending ? 'not-allowed' : 'pointer',
                opacity: linkIdea.isPending ? 0.5 : 1,
              }}
              onClick={() => !linkIdea.isPending && handleLinkIdea(idea.id)}
            >
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="bold" style={{ color: 'var(--color-text-primary)' }}>
                  {idea.title}
                </Text>
                {idea.summary && (
                  <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
                    {idea.summary.substring(0, 100)}
                    {idea.summary.length > 100 ? '...' : ''}
                  </Text>
                )}
              </Flex>
              <Button size="1" variant="soft" disabled={linkIdea.isPending}>
                <LinkIcon size={14} />
              </Button>
            </Flex>
          ))}
        </Flex>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="2"
          py="6"
          style={{ color: 'var(--color-text-soft)' }}
        >
          <Search size={32} />
          <Text size="2">No ideas found</Text>
          {searchQuery && <Text size="1">Try a different search term</Text>}
        </Flex>
      )}
    </Flex>
  );
}

/**
 * NewIdeaTab - Create new idea and auto-link
 */
function NewIdeaTab({ writingId, onSuccess }: { writingId: number; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const createIdea = useCreateIdea();
  const linkIdea = useLinkIdea(writingId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const newIdea = await createIdea.mutateAsync({
        title: title.trim(),
        summary: summary.trim() || undefined,
        status: 'in_progress' as IdeaStatus,
        priority: 'medium',
      });
      
      await linkIdea.mutateAsync(newIdea.id);
      toast.success('Idea created and linked');
      setTitle('');
      setSummary('');
      onSuccess();
    } catch (error) {
      console.error('Failed to create and link idea:', error);
      toast.error('Failed to create and link idea');
    }
  };

  const isLoading = createIdea.isPending || linkIdea.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <label>
          <Text as="div" size="2" mb="1" weight="bold">
            Title *
          </Text>
          <TextField.Root
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's the big idea?"
            required
            disabled={isLoading}
          />
        </label>

        <label>
          <Text as="div" size="2" mb="1" weight="bold">
            Summary
          </Text>
          <TextArea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief description (optional)"
            disabled={isLoading}
            rows={3}
          />
        </label>

        <Flex gap="2" justify="end">
          <Button type="submit" disabled={isLoading || !title.trim()}>
            {isLoading ? (
              <>
                <LoadingInline />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create & Link
              </>
            )}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
