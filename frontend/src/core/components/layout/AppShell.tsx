import { Flex, Container, Box } from '@radix-ui/themes';
import { Outlet } from 'react-router-dom';
import { AppNavigation } from './AppNavigation';

export function AppShell() {
  return (
    <Flex direction="column" style={{ minHeight: '100vh' }}>
      {/* Header with Navigation */}
      <Box
        style={{
          borderBottom: '1px solid var(--gray-a6)',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <Container size="4">
          <AppNavigation />
        </Container>
      </Box>

      {/* Main Content */}
      <Box style={{ flex: 1, backgroundColor: 'var(--gray-a2)' }}>
        <Container size="4" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
          <Outlet />
        </Container>
      </Box>
    </Flex>
  );
}
