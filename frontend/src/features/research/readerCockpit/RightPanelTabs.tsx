import { Tabs } from '@radix-ui/themes';
import type { ReactNode } from 'react';

type RightPanelTabsProps = {
  activeTab: string;
  onTabChange: (value: string) => void;
  notes: ReactNode;
  metadata: ReactNode;
  clips: ReactNode;
};

export function RightPanelTabs({
  activeTab,
  onTabChange,
  notes,
  metadata,
  clips,
}: RightPanelTabsProps) {
  return (
    <Tabs.Root value={activeTab} onValueChange={onTabChange} style={{ height: '100%', minHeight: 0 }}>
      <Tabs.List>
        <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
        <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
        <Tabs.Trigger value="clips">Clips</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="notes" style={{ paddingTop: 'var(--space-3)' }}>
        {notes}
      </Tabs.Content>
      <Tabs.Content value="metadata" style={{ paddingTop: 'var(--space-3)' }}>
        {metadata}
      </Tabs.Content>
      <Tabs.Content value="clips" style={{ paddingTop: 'var(--space-3)' }}>
        {clips}
      </Tabs.Content>
    </Tabs.Root>
  );
}
