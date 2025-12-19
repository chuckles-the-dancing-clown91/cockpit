/**
 * LinkedIdeasPanel - Shows ideas linked to a writing
 * 
 * Simple sidebar showing linked ideas with unlink capability.
 * Reuses IdeaCard component from ideas feature.
 */

import { useState } from 'react';
import { Flex, Text, Button, Card, Box } from '@radix-ui/themes';
import { Plus, X, Lightbulb } from 'lucide-react';
import { useLinkedIdeas, useUnlinkIdea } from '../../hooks/useWriting';
import { useIdeas } from '@/features/ideas/hooks/useIdeas';
import { LinkIdeaDialog } from './LinkIdeaDialog';
import { toast } from '@/core/lib/toast';
import type { Idea } from '@/shared/types';

interface LinkedIdeasPanelProps {
  writingId: number;
}

export function LinkedIdeasPanel({ writingId }: LinkedIdeasPanelProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const { data: linkedIdeaIds, isLoading, error, refetch } = useLinkedIdeas(writingId);
  const { data: allIdeas, isLoading: loadingAllIdeas } = useIdeas();
  const unlinkIdea = useUnlinkIdea(writingId);
  
  // Header - always show
  const header = (
    <Flex justify="between" align="center" p="3" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <Flex align="center" gap="2">
        <Lightbulb size={18} />
        <Text weight="medium" size="3">Linked Ideas</Text>
      </Flex>
      <Button 
        size="1" 
        variant="ghost"
        onClick={() => setShowLinkDialog(true)}
      >
        <Plus size={14} />
      </Button>
    </Flex>
  );
  
  // Loading state
  if (isLoading || loadingAllIdeas) {
    return (
      <Flex direction="column" style={{ height: '100%' }}>
        {header}
        <Flex p="4" align="center" justify="center">
          <Text size="2" color="gray">Loading...</Text>
        </Flex>
        <LinkIdeaDialog 
          writingId={writingId} 
          open={showLinkDialog} 
          onClose={() => setShowLinkDialog(false)} 
        />
      </Flex>
    );
  }
  
  // Error state - still show link button
  if (error) {
    console.error('Failed to load linked ideas:', error);
    return (
      <Flex direction="column" style={{ height: '100%' }}>
        {header}
        <Flex direction="column" gap="3" p="4">
          <Text size="2" color="red">Failed to load linked ideas</Text>
          <Text size="1" color="gray">{error instanceof Error ? error.message : 'Unknown error'}</Text>
          <Button size="2" onClick={() => refetch()}>Retry</Button>
        </Flex>
        <LinkIdeaDialog 
          writingId={writingId} 
          open={showLinkDialog} 
          onClose={() => setShowLinkDialog(false)} 
        />
      </Flex>
    );
  }
  
  // Filter to get actual idea objects
  const linkedIdeas = (allIdeas || []).filter(idea => 
    linkedIdeaIds && linkedIdeaIds.includes(idea.id)
  );
  
  const handleUnlink = async (ideaId: number, ideaTitle: string) => {
    try {
      await unlinkIdea.mutateAsync(ideaId);
      toast.success(`Unlinked: ${ideaTitle}`);
    } catch (err) {
      console.error('Failed to unlink idea:', err);
      toast.error('Failed to unlink idea');
    }
  };
  
  // Empty state
  if (!linkedIdeas || linkedIdeas.length === 0) {
    return (
      <Flex direction="column" style={{ height: '100%' }}>
        {header}
        <Flex direction="column" gap="3" p="4" align="center" justify="center" style={{ flex: 1 }}>
          <Lightbulb size={32} style={{ color: 'var(--color-text-muted)' }} />
          <Text size="2" align="center" color="gray">
            No ideas linked yet
          </Text>
          <Text size="1" align="center" color="gray">
            Link ideas to organize your thoughts
          </Text>
        </Flex>
        <LinkIdeaDialog 
          writingId={writingId} 
          open={showLinkDialog} 
          onClose={() => setShowLinkDialog(false)} 
        />
      </Flex>
    );
  }
  
  // Render linked ideas
  return (
    <Flex direction="column" style={{ height: '100%' }}>
      {header}
      
      <Box style={{ flex: 1, overflow: 'auto' }} p="2">
        <Flex direction="column" gap="2">
          {linkedIdeas.map((idea) => (
            <Card 
              key={idea.id}
              style={{ 
                position: 'relative',
                cursor: 'pointer',
                padding: 'var(--space-3)',
              }}
            >
              {/* Unlink button */}
              <Button
                size="1"
                variant="ghost"
                color="gray"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  padding: '4px',
                  minWidth: 'auto',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlink(idea.id, idea.title);
                }}
                disabled={unlinkIdea.isPending}
              >
                <X size={14} />
              </Button>
              
              {/* Idea content */}
              <Flex direction="column" gap="1" style={{ paddingRight: 28 }}>
                <Text weight="medium" size="2" style={{ lineHeight: 1.3 }}>
                  {idea.title}
                </Text>
                {idea.summary && (
                  <Text size="1" color="gray" style={{ lineHeight: 1.4 }}>
                    {idea.summary.length > 80 
                      ? `${idea.summary.substring(0, 80)}...` 
                      : idea.summary
                    }
                  </Text>
                )}
                <Flex gap="2" mt="1">
                  <Text 
                    size="1" 
                    style={{ 
                      color: idea.status === 'complete' ? 'var(--color-success)' :
                             idea.status === 'in_progress' ? 'var(--color-primary)' :
                             'var(--color-text-muted)'
                    }}
                  >
                    {idea.status.replace('_', ' ')}
                  </Text>
                  <Text size="1" color="gray">•</Text>
                  <Text 
                    size="1"
                    style={{
                      color: idea.priority === 'high' ? 'var(--color-error)' :
                             idea.priority === 'medium' ? 'var(--color-warning)' :
                             'var(--color-text-muted)'
                    }}
                  >
                    {idea.priority}
                  </Text>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      </Box>
      
      <LinkIdeaDialog 
        writingId={writingId} 
        open={showLinkDialog} 
        onClose={() => setShowLinkDialog(false)} 
      />
    </Flex>
  );
}
