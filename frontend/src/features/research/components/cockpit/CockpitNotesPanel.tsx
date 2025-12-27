import { Box, Flex, Heading, Text } from '@radix-ui/themes';

import { EntityNotesPanel } from '@/features/notes';
import type { NoteEntityType } from '@/shared/types';

type CockpitNotesPanelProps = {
  noteTarget: { entityType: NoteEntityType; entityId: number } | null;
};

export function CockpitNotesPanel({ noteTarget }: CockpitNotesPanelProps) {
  return (
    <Box
      style={{
        width: '25%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface-soft)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'auto',
          backgroundColor: 'var(--color-surface-soft)',
          padding: 'var(--space-3)',
        }}
      >
        {!noteTarget ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap="2"
            style={{ minHeight: '100%' }}
          >
            <Heading size="3">No linked notes</Heading>
            <Text color="gray" align="center">
              Launch Research Cockpit from a reference or idea to view its notes here.
            </Text>
          </Flex>
        ) : (
          <EntityNotesPanel
            entityType={noteTarget.entityType}
            entityId={noteTarget.entityId}
            title=""
            placeholder="Write notes for this item..."
            minHeight="320px"
          />
        )}
      </Box>
    </Box>
  );
}
