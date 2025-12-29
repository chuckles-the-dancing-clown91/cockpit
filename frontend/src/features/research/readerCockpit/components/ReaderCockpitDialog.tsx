import { Dialog, Button, Flex, Text } from '@radix-ui/themes';
import { X } from 'lucide-react';
import { useReferenceReader } from '@/features/references/hooks/useReferenceReader';
import { ReaderCockpit } from './ReaderCockpit';

interface ReaderCockpitDialogProps {
  open: boolean;
  onClose: () => void;
  referenceId: number;
}

export function ReaderCockpitDialog({ open, onClose, referenceId }: ReaderCockpitDialogProps) {
  const { data: article, isLoading } = useReferenceReader(referenceId, open);

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Content style={{ width: 'calc(100vw - 4rem)', height: 'calc(100vh - 4rem)', maxWidth: 'none' }}>
        <Flex direction="column" height="100%">
          <Flex justify="between" align="center" pb="3">
            <Dialog.Title>
              {isLoading ? 'Loading...' : article?.title || 'Reader Cockpit'}
            </Dialog.Title>
            <Dialog.Close>
              <Button variant="ghost" size="1" aria-label="Close reader cockpit">
                <X width={20} height={20} />
              </Button>
            </Dialog.Close>
          </Flex>
          <ReaderCockpit referenceId={referenceId} />
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
