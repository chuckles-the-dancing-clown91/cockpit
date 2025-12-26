import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Card, Flex, Heading, Text } from '@radix-ui/themes';

import { EntityNotesPanel } from '@/features/notes';
import type { NoteEntityType } from '@/shared/types';

function isNoteEntityType(value: string | null): value is NoteEntityType {
  return value === 'idea' || value === 'reference' || value === 'writing';
}

export function NotesCockpitView() {
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const entityType = params.get('entityType');
  const entityIdRaw = params.get('entityId');
  const title = params.get('title') ?? 'Notes';

  const parsedEntity = useMemo(() => {
    if (!isNoteEntityType(entityType)) return null;
    const id = Number(entityIdRaw);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { entityType, entityId: id } as { entityType: NoteEntityType; entityId: number };
  }, [entityType, entityIdRaw]);

  return (
    <Flex
      direction="column"
      style={{
        width: '100vw',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <Flex
        align="center"
        justify="between"
        style={{
          padding: 'var(--space-3)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <Heading size="4" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </Heading>
      </Flex>

      <Box style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--space-3)' }}>
        {!parsedEntity ? (
          <Card>
            <Flex direction="column" gap="2">
              <Heading size="3">No linked note target</Heading>
              <Text size="2" color="gray">
                This notes panel needs an entity target (reference / idea / writing). Open Research Cockpit from a reference or idea.
              </Text>
            </Flex>
          </Card>
        ) : (
          <EntityNotesPanel
            entityType={parsedEntity.entityType}
            entityId={parsedEntity.entityId}
            title=""
            placeholder="Write notes for this item..."
          />
        )}
      </Box>
    </Flex>
  );
}
