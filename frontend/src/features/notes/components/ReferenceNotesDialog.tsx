import { X } from 'lucide-react';
import { Button, Dialog } from '@radix-ui/themes';
import { EntityNotesPanel } from './EntityNotesPanel';

interface ReferenceNotesDialogProps {
  open: boolean;
  onClose: () => void;
  referenceId: number;
  referenceTitle: string;
}

/**
 * ReferenceNotesDialog - Modal for editing reference notes
 * 
 * Opens a full dialog with EntityNotesPanel for editing notes
 * on a specific reference.
 */
export function ReferenceNotesDialog({
  open,
  onClose,
  referenceId,
  referenceTitle,
}: ReferenceNotesDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Content
        style={{
          width: 'min(700px, calc(100% - 2rem))',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--gray-a6)',
          }}
        >
          <Dialog.Title>Notes: {referenceTitle}</Dialog.Title>
          <Dialog.Close>
            <Button variant="ghost" size="1" aria-label="Close notes">
              <X width={20} height={20} />
            </Button>
          </Dialog.Close>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
          <EntityNotesPanel
            entityType="reference"
            entityId={referenceId}
            noteType="main"
            title=""
            placeholder="Write your notes, thoughts, and annotations about this reference..."
            minHeight="400px"
          />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
