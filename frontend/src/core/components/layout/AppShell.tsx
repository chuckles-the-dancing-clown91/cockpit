import { Flex, Box } from '@radix-ui/themes';
import { Outlet } from 'react-router-dom';
import { AppNavigation } from './AppNavigation';

export function AppShell() {
  return (
    <Flex direction="column" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header with Navigation */}
      <Box
        style={{
          borderBottom: '1px solid var(--gray-a6)',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <AppNavigation />
      </Box>

      {/* Main Content with Sidebar */}
      <Flex style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </Flex>
    </Flex>
  );
}
