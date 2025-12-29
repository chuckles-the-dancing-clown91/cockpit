import { Box } from '@radix-ui/themes';
import { EntityNotesPanel } from '@/features/notes';

interface ReferenceNotesViewProps {
  referenceId: number;
}

export const ReferenceNotesView = ({ referenceId }: ReferenceNotesViewProps) => {
  return (
    <Box p="4" style={{ height: '100%' }}>
      <EntityNotesPanel
        entityType="reference"
        entityId={referenceId}
        noteType="main"
        title="Reference Notes"
        placeholder="Write your notes, thoughts, and annotations about this reference..."
        minHeight="100%"
      />
    </Box>
  );
};
