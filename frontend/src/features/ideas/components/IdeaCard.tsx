import { Card, Flex, Text, Badge, Button, Checkbox, Select } from '@radix-ui/themes';
import { Calendar, Archive as ArchiveIcon, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import type { Idea, IdeaStatus } from '@/shared/types';
import { IDEA_STATUSES } from '@/shared/constants';

interface IdeaCardProps {
  idea: Idea;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onStatusChange?: (id: number, status: IdeaStatus) => void;
  onClick?: () => void;
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
 * - Multi-select checkbox
 * - Selection ring highlighting
 * - Status and priority badges
 * - Click anywhere on card to open detail view
 * - Archive action
 * - Last modified date
 * - Hover state with shadow
 * 
 * Usage:
 * ```tsx
 * <IdeaCard
 *   idea={idea}
 *   selected={selectedIds.includes(idea.id)}
 *   onToggleSelect={(id) => toggleSelect(id)}
 *   onClick={() => setSelectedIdea(idea)}
 *   onArchive={() => handleArchive(idea.id)}
 * />
 * ```
 */
export function IdeaCard({ idea, selected = false, onToggleSelect, onStatusChange, onClick, onArchive }: IdeaCardProps) {
  const getStatusIcon = (status: IdeaStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-success)' }} />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />;
      case 'stalled':
        return <Circle className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />;
      default:
        return <Circle className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />;
    }
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    console.log('Card clicked:', idea.title);
    // Don't trigger card click if clicking on action buttons or checkbox
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('label[data-checkbox-root]')) {
      console.log('Button/checkbox clicked, ignoring card click');
      return;
    }
    console.log('Calling onClick handler');
    onClick?.();
  };
  
  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(idea.id);
  };
  
  const handleStatusChange = (newStatus: string) => {
    onStatusChange?.(idea.id, newStatus as IdeaStatus);
  };

  return (
    <Card
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: selected ? '0 0 0 2px var(--color-primary)' : undefined,
      }}
      className="hover:shadow-md"
      onClick={handleCardClick}
    >
      <Flex direction="column" gap="3">
        {/* Header */}
        <Flex justify="between" align="start" gap="3">
          {onToggleSelect && (
            <Checkbox
              checked={selected}
              onClick={handleCheckboxChange}
              style={{ marginTop: '0.25rem', flexShrink: 0 }}
            />
          )}
          <Flex
            direction="column"
            gap="2"
            style={{ flex: 1, minWidth: 0 }}
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
          {onArchive && (
            <Flex gap="1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="1"
                color="gray"
                onClick={onArchive}
              >
                <ArchiveIcon className="w-4 h-4" />
              </Button>
            </Flex>
          )}
        </Flex>

        {/* Footer */}
        <Flex justify="between" align="center">
          <Flex gap="2" align="center">
            {getStatusIcon(idea.status)}
            <Badge color={PRIORITY_COLORS[idea.priority]} variant="soft" size="1">
              {idea.priority.toUpperCase()}
            </Badge>
            <Flex align="center" gap="1">
              <Calendar className="w-3 h-3" style={{ color: 'var(--color-text-soft)' }} />
              <Text size="1" style={{ color: 'var(--color-text-soft)' }}>
                {new Date(idea.dateUpdated).toLocaleDateString()}
              </Text>
            </Flex>
          </Flex>

          {onStatusChange && (
            <div onClick={(e) => e.stopPropagation()}>
              <Select.Root value={idea.status} onValueChange={handleStatusChange} size="1">
                <Select.Trigger style={{ width: '120px', height: '28px', fontSize: '12px' }} />
                <Select.Content>
                  {IDEA_STATUSES.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
