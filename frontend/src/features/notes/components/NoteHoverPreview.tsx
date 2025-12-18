import * as HoverCard from '@radix-ui/react-hover-card';
import { Text, Flex } from '@radix-ui/themes';
import { FileText } from 'lucide-react';
import type { NoteEntityType, NoteType } from '@/shared/types';
import { useNote } from '../hooks/useNotes';

interface NoteHoverPreviewProps {
  entityType: NoteEntityType;
  entityId: number;
  noteType?: NoteType;
  children: React.ReactNode;
  maxLength?: number;
}

/**
 * NoteHoverPreview - Hover card showing note preview
 * 
 * Displays read-only preview of note content on hover.
 * Strips HTML tags and shows first N characters.
 */
export function NoteHoverPreview({
  entityType,
  entityId,
  noteType = 'main',
  children,
  maxLength = 220,
}: NoteHoverPreviewProps) {
  const { data: note, isLoading } = useNote(entityType, entityId, noteType);
  
  // Strip HTML and truncate
  const previewText = (note?.bodyHtml ?? '')
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim()
    .slice(0, maxLength);
  
  const hasContent = previewText.length > 0;
  
  return (
    <HoverCard.Root openDelay={250}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-[9999] w-[360px] max-w-[90vw] p-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card-elevated)]"
        >
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <FileText className="w-4 h-4" style={{ color: 'var(--color-text-soft)' }} />
              <Text size="2" weight="medium" style={{ color: 'var(--color-text-soft)' }}>
                {isLoading ? 'Loading notes…' : 'Notes preview'}
              </Text>
            </Flex>
            
            {!isLoading && (
              <Text
                size="2"
                style={{
                  color: hasContent ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  lineHeight: '1.6',
                }}
              >
                {hasContent ? previewText : 'No notes yet.'}
                {previewText.length === maxLength && '…'}
              </Text>
            )}
          </Flex>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
