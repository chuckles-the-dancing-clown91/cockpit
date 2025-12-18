import { Flex, Text, Button, Card, Box } from '@radix-ui/themes';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  /**
   * Error title
   */
  title?: string;
  /**
   * Error message
   */
  message: string;
  /**
   * Optional retry callback
   */
  onRetry?: () => void;
  /**
   * Minimum height for the container
   */
  minHeight?: string;
  /**
   * Show as card (default: true)
   */
  asCard?: boolean;
}

/**
 * Standard Error State Component
 * 
 * Consistent error display used across the application.
 * 
 * Usage:
 * ```tsx
 * if (isError) {
 *   return (
 *     <ErrorState
 *       message={error.message}
 *       onRetry={refetch}
 *     />
 *   );
 * }
 * 
 * // Custom title
 * <ErrorState
 *   title="Failed to Load Ideas"
 *   message="Could not connect to database"
 *   onRetry={() => window.location.reload()}
 * />
 * 
 * // Without card wrapper
 * <ErrorState
 *   message="Something went wrong"
 *   asCard={false}
 * />
 * ```
 */
export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  minHeight = '400px',
  asCard = true,
}: ErrorStateProps) {
  const content = (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      style={{ minHeight }}
    >
      <AlertCircle 
        className="h-12 w-12 text-[var(--color-danger)]" 
        strokeWidth={1.5}
      />
      <Flex direction="column" align="center" gap="1">
        <Text size="4" weight="medium" className="text-[var(--color-text-primary)]">
          {title}
        </Text>
        <Text size="2" className="text-[var(--color-text-soft)] text-center max-w-md">
          {message}
        </Text>
      </Flex>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="soft"
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
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
 * Inline error state for smaller components
 */
export function ErrorInline({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void;
}) {
  return (
    <Flex align="center" gap="2" py="2" className="text-[var(--color-danger)]">
      <AlertCircle className="h-4 w-4" />
      <Text size="2" className="flex-1">
        {message}
      </Text>
      {onRetry && (
        <Button
          size="1"
          variant="ghost"
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </Flex>
  );
}
