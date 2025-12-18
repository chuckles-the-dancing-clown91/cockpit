import { ReactNode } from 'react';
import { Flex, Text, Button, Card, Box } from '@radix-ui/themes';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /**
   * Icon to display (Lucide icon component)
   */
  icon: LucideIcon;
  /**
   * Title text
   */
  title: string;
  /**
   * Description text
   */
  description: string;
  /**
   * Optional action button
   */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /**
   * Minimum height for the container
   */
  minHeight?: string;
  /**
   * Show as card (default: true)
   */
  asCard?: boolean;
  /**
   * Custom content to render below description
   */
  children?: ReactNode;
}

/**
 * Standard Empty State Component
 * 
 * Consistent empty state display used across the application.
 * 
 * Usage:
 * ```tsx
 * if (ideas.length === 0) {
 *   return (
 *     <EmptyState
 *       icon={Lightbulb}
 *       title="No ideas yet"
 *       description="Start capturing your thoughts and ideas"
 *       action={{
 *         label: 'Create Idea',
 *         onClick: () => setShowDialog(true),
 *         icon: Plus,
 *       }}
 *     />
 *   );
 * }
 * 
 * // Without action button
 * <EmptyState
 *   icon={Search}
 *   title="No results found"
 *   description="Try adjusting your filters"
 * />
 * 
 * // Without card wrapper
 * <EmptyState
 *   icon={Archive}
 *   title="Archive is empty"
 *   description="Archived items will appear here"
 *   asCard={false}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  minHeight = '400px',
  asCard = true,
  children,
}: EmptyStateProps) {
  const content = (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      style={{ minHeight }}
    >
      <Icon 
        className="h-12 w-12 text-[var(--color-text-soft)]" 
        strokeWidth={1.5}
      />
      <Flex direction="column" align="center" gap="1">
        <Text size="4" weight="medium" className="text-[var(--color-text-primary)]">
          {title}
        </Text>
        <Text size="2" className="text-[var(--color-text-soft)] text-center max-w-md">
          {description}
        </Text>
      </Flex>
      {children}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-2"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </Flex>
  );

  if (!asCard) {
    return content;
  }

  return (
    <Box p="4">
      <Card>{content}</Card>
    </Box>
  );
}

/**
 * Inline empty state for smaller components (like empty lists in sidebars)
 */
export function EmptyInline({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <Flex align="center" gap="2" py="3" px="2" className="text-[var(--color-text-soft)]">
      <Icon className="h-4 w-4" />
      <Text size="2">{message}</Text>
    </Flex>
  );
}
