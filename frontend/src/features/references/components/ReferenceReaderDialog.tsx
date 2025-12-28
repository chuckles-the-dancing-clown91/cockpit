import { X, ExternalLink } from 'lucide-react';
import { Button, Dialog, Flex, Text } from '@radix-ui/themes';

import { useReferenceReader } from '../hooks/useReferenceReader';

interface ReferenceReaderDialogProps {
  open: boolean;
  onClose: () => void;
  referenceId: number;
  referenceTitle: string;
  referenceUrl?: string | null;
}

export function ReferenceReaderDialog({
  open,
  onClose,
  referenceId,
  referenceTitle,
  referenceUrl,
}: ReferenceReaderDialogProps) {
  const { data, isLoading, error } = useReferenceReader(referenceId, open);
  const html = data?.contentHtml?.trim();
  const fallbackText = data?.contentText?.trim();
  const showEmptyState = !isLoading && !error && !html && !fallbackText;
  const errorMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Failed to load reader view.';
  const displayTitle = data?.title?.trim() || referenceTitle;
  const openUrl = data?.url || referenceUrl;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Content
        style={{
          width: 'min(980px, calc(100% - 2rem))',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <Flex
          align="center"
          justify="between"
          gap="3"
          px="4"
          py="3"
          style={{ borderBottom: '1px solid var(--gray-a6)' }}
        >
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Dialog.Title>
              <Text
                as="div"
                size="4"
                weight="bold"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {displayTitle}
              </Text>
            </Dialog.Title>
            {data?.excerpt && (
              <Text size="1" color="gray">
                {data.excerpt}
              </Text>
            )}
          </Flex>
          <Flex gap="2" align="center">
            {openUrl && (
              <Button
                variant="soft"
                onClick={() => window.open(openUrl, '_blank')}
              >
                <ExternalLink width={16} height={16} />
                Open source
              </Button>
            )}
            <Dialog.Close>
              <Button variant="ghost" size="1" aria-label="Close reader">
                <X width={20} height={20} />
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)' }}>
          {isLoading && (
            <Text size="2" color="gray">
              Loading reader view...
            </Text>
          )}
          {error && (
            <Text size="2" color="red">
              {errorMessage}
            </Text>
          )}
          {!isLoading && !error && html && (
            <div
              className="reference-reader-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          {!isLoading && !error && !html && fallbackText && (
            <div className="reference-reader-content">
              <p style={{ whiteSpace: 'pre-wrap' }}>{fallbackText}</p>
            </div>
          )}
          {showEmptyState && (
            <Text size="2" color="gray">
              No reader content available for this reference yet.
            </Text>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
