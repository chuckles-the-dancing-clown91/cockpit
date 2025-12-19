import { Outlet } from 'react-router-dom';
import { Flex, Box } from '@radix-ui/themes';
import { Sidebar } from '@/core/components/layout/Sidebar';

export function WritingView() {
  return (
    <Flex style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar Navigation */}
      <Sidebar domain="writing" />

      {/* Main Content */}
      <Box style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Flex>
  );
}
