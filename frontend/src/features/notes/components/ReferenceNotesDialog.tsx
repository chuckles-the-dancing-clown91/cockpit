import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
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
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(700px,100%-2rem)] max-h-[90vh] flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)] text-[var(--color-text-primary)]">
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
              Notes: {referenceTitle}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
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
      </Dialog.Portal>
    </Dialog.Root>
  );
}
