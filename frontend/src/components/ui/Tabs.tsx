import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn';

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn(
      'inline-flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface-soft)] p-1 border border-[var(--color-border-subtle)]',
      className
    )}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      'px-4 py-2 text-sm rounded-[var(--radius-button)] data-[state=active]:bg-[var(--color-accent-soft)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:border data-[state=active]:border-[var(--color-border)] transition-colors',
      'data-[state=inactive]:text-[var(--color-text-muted)]',
      className
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }: TabsPrimitive.TabsContentProps) => (
  <TabsPrimitive.Content className={cn('mt-2', className)} {...props} />
);
