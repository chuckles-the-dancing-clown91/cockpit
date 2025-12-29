import { Box, Flex, Text } from '@radix-ui/themes';
import { useReferenceReader } from '@/features/references/hooks/useReferenceReader';
import { MarkdownView } from './MarkdownView';
import { ReferenceNotesView } from './ReferenceNotesView';

interface ReaderCockpitProps {
  referenceId: number;
}

export const ReaderCockpit = ({ referenceId }: ReaderCockpitProps) => {
  const { data, isLoading, error } = useReferenceReader(referenceId);

  return (
    <Flex gap="3" height="100%">
      <Box style={{ flexBasis: '75%', flexShrink: 0, overflowY: 'auto' }}>
        {isLoading && <Text>Loading...</Text>}
        {error && <Text color="red">Error: {error.message}</Text>}
        {data && <MarkdownView content={data.contentHtml} />}
      </Box>
      <Box width="2px" style={{ backgroundColor: 'var(--gray-a7)' }} />
      <Box style={{ flexBasis: '25%', flexShrink: 0, overflow: 'hidden' }}>
        <ReferenceNotesView referenceId={referenceId} />
      </Box>
    </Flex>
  );
};

