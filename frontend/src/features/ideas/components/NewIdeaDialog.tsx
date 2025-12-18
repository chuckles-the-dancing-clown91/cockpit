import { Dialog, Flex, Text, Button, TextField, TextArea, Select } from '@radix-ui/themes';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import type { IdeaStatus, IdeaPriority } from '@/shared/types';
import { useCreateIdea } from '../hooks/useIdeas';

interface NewIdeaDialogProps {
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

/**
 * NewIdeaDialog - Modal for creating new ideas
 * 
 * Features:
 * - Required: title
 * - Optional: summary, status, priority, target
 * - Form validation
 * - Auto-reset on close
 */
export function NewIdeaDialog({ open, onClose }: NewIdeaDialogProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<IdeaStatus>('in_progress');
  const [priority, setPriority] = useState<IdeaPriority>('medium');
  const [target, setTarget] = useState('');
  
  const createIdea = useCreateIdea();
  
  const handleClose = () => {
    // Reset form
    setTitle('');
    setSummary('');
    setStatus('in_progress');
    setPriority('medium');
    setTarget('');
    onClose();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    await createIdea.mutateAsync({
      title: title.trim(),
      summary: summary.trim() || undefined,
      status,
      priority,
      target: target.trim() || undefined,
    });
    
    handleClose();
  };
  
  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>New Idea</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a new idea to track your thoughts and projects.
        </Dialog.Description>
        
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
              />
            </label>
            
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
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
                <Text as="div" size="2" mb="1" weight="bold">
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
                <Text as="div" size="2" mb="1" weight="bold">
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
              <Text as="div" size="2" mb="1" weight="bold">
                Target (optional)
              </Text>
              <TextField.Root
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g., blog post, novel, article"
              />
            </label>
          </Flex>
          
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={!title.trim() || createIdea.isPending}>
              <Plus className="w-4 h-4" />
              {createIdea.isPending ? 'Creating...' : 'Create Idea'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
