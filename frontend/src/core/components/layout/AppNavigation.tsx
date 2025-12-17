import { Flex, Heading, Tabs } from '@radix-ui/themes';
import { useNavigate, useLocation } from 'react-router-dom';
import { PenTool, Search, Settings } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';

export function AppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (location.pathname.startsWith('/writing')) return 'writing';
    if (location.pathname.startsWith('/research')) return 'research';
    if (location.pathname.startsWith('/system')) return 'system';
    return 'writing';
  };

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  return (
    <Flex justify="between" align="center" py="4">
      {/* Logo/Title */}
      <Flex align="center" gap="3">
        <Heading size="6">Cockpit</Heading>
      </Flex>

      {/* Main Navigation Tabs */}
      <Tabs.Root value={getActiveTab()} onValueChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Trigger value="writing">
            <Flex gap="2" align="center">
              <PenTool size={16} />
              Writing
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="research">
            <Flex gap="2" align="center">
              <Search size={16} />
              Research
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="system">
            <Flex gap="2" align="center">
              <Settings size={16} />
              System
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {/* Theme Switcher */}
      <ThemeSwitcher />
    </Flex>
  );
}
