import { useSearchParams } from 'react-router-dom';
import { Flex, Box } from '@radix-ui/themes';
import { BookOpen } from 'lucide-react';
import { WritingWorkspace } from '@/features/writing';

export function EditorView() {
  const [searchParams] = useSearchParams();
  const writingId = searchParams.get('id');
  const parsedId = writingId ? Number.parseInt(writingId, 10) : NaN;

  if (!writingId || !Number.isFinite(parsedId)) {
    return (
      <Flex 
        align="center" 
        justify="center" 
        style={{ 
          height: '100%',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          color: 'var(--color-text-soft)'
        }}
      >
        <BookOpen size={48} />
        <Box style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--font-size-4)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
            No writing selected
          </p>
          <p style={{ fontSize: 'var(--font-size-2)', color: 'var(--color-text-muted)' }}>
            Select a writing from the Library to start editing
          </p>
        </Box>
      </Flex>
    );
  }

  return <WritingWorkspace writingId={parsedId} />;
}
