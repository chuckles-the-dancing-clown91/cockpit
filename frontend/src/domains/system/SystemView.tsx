import { Flex, Tabs } from '@radix-ui/themes';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Settings, Database, FileText, Calendar } from 'lucide-react';

export function SystemView() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === '/system' || location.pathname === '/system/settings') return 'settings';
    if (location.pathname === '/system/storage') return 'storage';
    if (location.pathname === '/system/logs') return 'logs';
    if (location.pathname === '/system/tasks') return 'tasks';
    return 'settings';
  };

  const handleTabChange = (value: string) => {
    navigate(`/system/${value}`);
  };

  return (
    <Flex direction="column" gap="4">
      <Tabs.Root value={getActiveTab()} onValueChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Trigger value="settings">
            <Flex gap="2" align="center">
              <Settings size={16} />
              Settings
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="storage">
            <Flex gap="2" align="center">
              <Database size={16} />
              Storage
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="logs">
            <Flex gap="2" align="center">
              <FileText size={16} />
              Logs
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="tasks">
            <Flex gap="2" align="center">
              <Calendar size={16} />
              Tasks
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <Outlet />
    </Flex>
  );
}
