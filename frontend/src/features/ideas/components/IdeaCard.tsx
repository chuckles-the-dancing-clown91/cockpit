import { Card, Flex, Text, Badge, Button } from '@radix-ui/themes';
import { Calendar, Trash2, Archive as ArchiveIcon } from 'lucide-react';
import type { Idea } from '@/shared/types';

interface IdeaCardProps {
  idea: Idea;
  onClick?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
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

const STATUS_LABELS = {
  in_progress: 'In Progress',
  stalled: 'Stalled',
  complete: 'Complete',
} as const;

/**
 * IdeaCard - Reusable card component for displaying an idea
 * 
 * Features:
 * - Status and priority badges
 * - Click to open detail view
 * - Delete and archive actions
 * - Hover state
 * 
 * Usage:
 * ```tsx
 * <IdeaCard
 *   idea={idea}
 *   onClick={() => setSelectedIdea(idea)}
 *   onDelete={() => handleDelete(idea.id)}
 *   onArchive={() => handleArchive(idea.id)}
 * />
 * ```
 */
export function IdeaCard({ idea, onClick, onDelete, onArchive }: IdeaCardProps) {
  return (
    <Card
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
      className="hover:shadow-md"
    >
      <Flex direction="column" gap="3">
        {/* Header */}
        <Flex justify="between" align="start" gap="3">
          <Flex
            direction="column"
            gap="2"
            style={{ flex: 1, minWidth: 0 }}
            onClick={onClick}
          >
            <Text size="4" weight="medium" style={{ color: 'var(--color-text-primary)' }}>
              {idea.title}
            </Text>
            {idea.summary && (
              <Text
                size="2"
                style={{
                  color: 'var(--color-text-soft)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {idea.summary}
              </Text>
            )}
          </Flex>

          {/* Actions */}
          <Flex gap="1" onClick={(e) => e.stopPropagation()}>
            {onArchive && (
              <Button
                variant="ghost"
                size="1"
                color="gray"
                onClick={onArchive}
              >
                <ArchiveIcon className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="1"
                color="red"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </Flex>
        </Flex>

        {/* Footer */}
        <Flex justify="between" align="center">
          <Flex gap="2" align="center">
            <Badge color={STATUS_COLORS[idea.status]}>
              {STATUS_LABELS[idea.status]}
            </Badge>
            <Badge color={PRIORITY_COLORS[idea.priority]} variant="soft">
              {idea.priority.toUpperCase()}
            </Badge>
          </Flex>

          <Flex align="center" gap="1">
            <Calendar className="w-3 h-3" style={{ color: 'var(--color-text-soft)' }} />
            <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
              {new Date(idea.dateAdded).toLocaleDateString()}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
