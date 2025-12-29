/**
 * LinkedIdeasPanel - Shows ideas linked to a writing
 * 
 * Sidebar showing linked ideas with notes and references accordion.
 * Uses existing hooks from notes and references features.
 */

import { useState } from 'react';
import { Flex, Text, Button, Card, Box, Separator } from '@radix-ui/themes';
import * as Accordion from '@radix-ui/react-accordion';
import { Plus, X, Lightbulb, ChevronDown, FileText, Link as LinkIcon, Edit } from 'lucide-react';
import { useLinkedIdeas, useUnlinkIdea } from '../../hooks/useWriting';
import { useIdeas } from '@/features/ideas/hooks/useIdeas';
import { useNote } from '@/features/notes/hooks/useNotes';
import { useIdeaReferences } from '@/features/references/hooks/useReferences';
import { LinkIdeaDialog } from './LinkIdeaDialog';
import { toast } from '@/core/lib/toast';
import type { Idea } from '@/shared/types';

interface LinkedIdeasPanelProps {
  writingId: number;
}

/**
 * Strip HTML tags for plain text preview, preserving line breaks
 */
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n');
  return (tmp.textContent || tmp.innerText || '').trim();
}

function ReferenceNotesAccordion({ notes }: { notes: string }) {
  return (
    <Accordion.Root type="single" collapsible>
      <Accordion.Item value="notes">
        <Accordion.Trigger asChild>
          <Button
            variant="ghost"
            size="1"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: '4px 8px',
              marginTop: '4px',
            }}
          >
            <Flex align="center" gap="2">
              <Text size="1" color="gray">
                Show notes
              </Text>
            </Flex>
            <ChevronDown size={14} style={{ transition: 'transform 150ms' }} />
          </Button>
        </Accordion.Trigger>
        <Accordion.Content style={{ padding: '8px' }}>
          <Text size="1" color="gray" style={{ whiteSpace: 'pre-wrap' }}>
            {notes}
          </Text>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}

/**
 * Component to show notes and references for a single linked idea
 */
function IdeaDetailsAccordion({ idea }: { idea: Idea }) {
  const { data: note, isLoading: loadingNote } = useNote('idea', idea.id, 'main');
  const { data: references, isLoading: loadingRefs } = useIdeaReferences(idea.id);

  const hasNotes = note && note.bodyHtml && note.bodyHtml.trim().length > 0;
  const hasReferences = references && references.length > 0;

  // Don't show accordion if no content
  if (!hasNotes && !hasReferences && !loadingNote && !loadingRefs) {
    return null;
  }

  return (
    <Accordion.Root type="single" collapsible>
      <Accordion.Item value="details">
        <Accordion.Trigger asChild>
          <Button
            variant="ghost"
            size="1"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: '4px 8px',
              marginTop: '4px',
            }}
          >
            <Flex align="center" gap="2">
              <Text size="1" color="gray">
                {loadingNote || loadingRefs ? 'Loading...' : 'Show details'}
              </Text>
            </Flex>
            <ChevronDown size={14} style={{ transition: 'transform 150ms' }} />
          </Button>
        </Accordion.Trigger>
        
        <Accordion.Content style={{ padding: '8px 0' }}>
          <Flex direction="column" gap="2">
            {/* Notes section */}
            {hasNotes && (
              <Box>
                <Flex align="center" gap="1" mb="1">
                  <FileText size={12} />
                  <Text size="1" weight="medium">Notes</Text>
                </Flex>
                <Text 
                  size="1" 
                  color="gray" 
                  style={{ 
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {(() => {
                    const plainText = stripHtml(note.bodyHtml);
                    return plainText.length > 150 
                      ? `${plainText.substring(0, 150)}...`
                      : plainText;
                  })()}
                </Text>
              </Box>
            )}

            {/* References section */}
            {hasReferences && (
              <Box>
                <Flex align="center" gap="1" mb="1">
                  <LinkIcon size={12} />
                  <Text size="1" weight="medium">
                    References ({references.length})
                  </Text>
                </Flex>
                <Flex direction="column" gap="2">
                  {references.map((ref) => (
                    <Box key={ref.id}>
                      <Text 
                        size="1" 
                        color="gray"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        • {ref.title || ref.url}
                      </Text>
                      {ref.notesMarkdown && ref.notesMarkdown.trim().length > 0 && (
                        <ReferenceNotesAccordion notes={ref.notesMarkdown} />
                      )}
                    </Box>
                  ))}
                </Flex>
              </Box>
            )}
          </Flex>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
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
                
                {/* Notes and References Accordion */}
                <IdeaDetailsAccordion idea={idea} />
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
