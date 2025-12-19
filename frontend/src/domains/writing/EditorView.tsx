import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Box, Button } from '@radix-ui/themes';
import { BookOpen } from 'lucide-react';
import { WritingWorkspace } from '@/features/writing';
import { useWritingStore } from '@/features/writing/store';

export function EditorView() {
  const navigate = useNavigate();
  const { activeWritingId, setActiveWriting, clearActiveWriting } = useWritingStore();

  // Check for writing ID in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const writingId = params.get('id');
    if (writingId) {
      const parsedId = Number.parseInt(writingId, 10);
      if (Number.isFinite(parsedId)) {
        setActiveWriting(parsedId);
      }
    }
  }, [setActiveWriting]);

  const handleCloseWriting = () => {
    clearActiveWriting();
    navigate('/writing');
  };

  if (!activeWritingId) {
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
        <Button onClick={() => navigate('/writing')}>
          Go to Library
        </Button>
      </Flex>
    );
  }

  return <WritingWorkspace writingId={activeWritingId} onClose={handleCloseWriting} />;
}
