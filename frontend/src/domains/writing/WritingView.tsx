import { Flex, Tabs } from '@radix-ui/themes';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FileEdit, Lightbulb, Archive } from 'lucide-react';

export function WritingView() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === '/writing' || location.pathname === '/writing/editor') return 'editor';
    if (location.pathname === '/writing/ideas') return 'ideas';
    if (location.pathname === '/writing/archive') return 'archive';
    return 'editor';
  };

  const handleTabChange = (value: string) => {
    navigate(`/writing/${value}`);
  };

  return (
    <Flex direction="column" gap="4">
      <Tabs.Root value={getActiveTab()} onValueChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Trigger value="editor">
            <Flex gap="2" align="center">
              <FileEdit size={16} />
              Editor
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="ideas">
            <Flex gap="2" align="center">
              <Lightbulb size={16} />
              Ideas
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="archive">
            <Flex gap="2" align="center">
              <Archive size={16} />
              Archive
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <Outlet />
    </Flex>
  );
}
