import { ReactNode } from 'react';
import { Flex, Text, Card, Box } from '@radix-ui/themes';
import { Lock } from 'lucide-react';
import { useFeatureEnabled, type FeatureCapabilities } from '@/core/hooks/useSettings';

interface CapabilityGateProps {
  /**
   * The feature to check
   */
  feature: keyof FeatureCapabilities;
  /**
   * Content to render when feature is enabled
   */
  children: ReactNode;
  /**
   * Optional fallback content when feature is disabled
   * If not provided, shows default "not configured" message
   */
  fallback?: ReactNode;
  /**
   * If true, returns null when disabled (hides completely)
   * If false, shows fallback or default message
   */
  hideWhenDisabled?: boolean;
}

/**
 * Capability Gate Component
 * 
 * Conditionally renders content based on feature availability.
 * Used to gracefully handle features that require API keys or configuration.
 * 
 * Usage:
 * ```tsx
 * <CapabilityGate feature="news">
 *   <NewsFeeds />
 * </CapabilityGate>
 * 
 * // With custom fallback
 * <CapabilityGate 
 *   feature="news" 
 *   fallback={<CustomMessage />}
 * >
 *   <NewsFeeds />
 * </CapabilityGate>
 * 
 * // Hide completely when disabled
 * <CapabilityGate feature="news" hideWhenDisabled>
 *   <NewsNav />
 * </CapabilityGate>
 * ```
 */
export function CapabilityGate({
  feature,
  children,
  fallback,
  hideWhenDisabled = false,
}: CapabilityGateProps) {
  const isEnabled = useFeatureEnabled(feature);

  // Feature is enabled - render children
  if (isEnabled) {
    return <>{children}</>;
  }

  // Feature disabled and should hide completely
  if (hideWhenDisabled) {
    return null;
  }

  // Feature disabled - show fallback or default message
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default "not configured" message
  return (
    <Box p="4">
      <Card>
        <Flex direction="column" align="center" gap="3" py="6">
          <Lock 
            className="h-12 w-12 text-[var(--color-text-soft)]" 
            strokeWidth={1.5}
          />
          <Flex direction="column" align="center" gap="1">
            <Text size="4" weight="medium" className="text-[var(--color-text-primary)]">
              Feature Not Configured
            </Text>
            <Text size="2" className="text-[var(--color-text-soft)] text-center max-w-md">
              This feature requires additional configuration. Please add your API key in Settings to enable {feature}.
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Box>
  );
}

/**
 * Hook to conditionally render navigation items
 * 
 * Usage:
 * ```tsx
 * const navItems = useCapabilityNav([
 *   { path: '/writing', label: 'Writing', icon: <Pencil />, feature: null },
 *   { path: '/research', label: 'Research', icon: <Search />, feature: 'news' },
 * ]);
 * ```
 */
export interface NavItem {
  path: string;
  label: string;
  icon?: ReactNode;
  feature?: keyof FeatureCapabilities | null;
}

export function useCapabilityNav(items: NavItem[]): NavItem[] {
  return items.filter((item) => {
    // No feature requirement - always show
    if (!item.feature) return true;
    
    // Check if feature is enabled
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useFeatureEnabled(item.feature);
  });
}
