import { Flex, Box } from '@radix-ui/themes';
import { Archive } from 'lucide-react';

export function ArchiveView() {
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
      <Archive size={48} />
      <Box style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--font-size-4)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
          Archive
        </p>
        <p style={{ fontSize: 'var(--font-size-2)', color: 'var(--color-text-muted)' }}>
          Coming soon: View archived writings and ideas
        </p>
      </Box>
    </Flex>
  );
}
