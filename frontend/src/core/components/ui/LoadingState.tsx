import { Flex, Text, Spinner } from '@radix-ui/themes';

interface LoadingStateProps {
  /**
   * Optional message to display below spinner
   */
  message?: string;
  /**
   * Size of the spinner
   */
  size?: '1' | '2' | '3';
  /**
   * Minimum height for the container
   */
  minHeight?: string;
}

/**
 * Standard Loading State Component
 * 
 * Consistent loading indicator used across the application.
 * 
 * Usage:
 * ```tsx
 * if (isLoading) return <LoadingState />;
 * 
 * // With message
 * if (isLoading) return <LoadingState message="Loading ideas..." />;
 * 
 * // Larger spinner
 * if (isLoading) return <LoadingState size="3" message="Syncing feeds..." />;
 * ```
 */
export function LoadingState({
  message,
  size = '3',
  minHeight = '400px',
}: LoadingStateProps) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      style={{ minHeight }}
      className="text-[var(--color-text-soft)]"
    >
      <Spinner size={size} />
      {message && (
        <Text size="2" className="text-[var(--color-text-soft)]">
          {message}
        </Text>
      )}
    </Flex>
  );
}

/**
 * Inline loading state for smaller components
 */
export function LoadingInline({ message }: { message?: string }) {
  return (
    <Flex align="center" gap="2" py="2">
      <Spinner size="1" />
      {message && (
        <Text size="1" className="text-[var(--color-text-soft)]">
          {message}
        </Text>
      )}
    </Flex>
  );
}
