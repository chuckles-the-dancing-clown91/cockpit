import { useNavigate } from 'react-router-dom';
import { Box } from '@radix-ui/themes';
import { WritingLibrary } from '@/features/writing';

export function LibraryView() {
  const navigate = useNavigate();

  return (
    <Box style={{ height: '100%', overflow: 'auto', padding: 'var(--space-6)' }}>
      <WritingLibrary
        onOpenWriting={(id) => {
          // Navigate to editor with writing ID in URL
          navigate(`/writing/editor?id=${id}`);
        }}
      />
    </Box>
  );
}
