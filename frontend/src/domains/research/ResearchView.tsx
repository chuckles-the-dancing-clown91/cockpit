import { Flex, Tabs } from '@radix-ui/themes';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Rss, Globe, Newspaper } from 'lucide-react';

export function ResearchView() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === '/research' || location.pathname === '/research/stream') return 'stream';
    if (location.pathname === '/research/sources') return 'sources';
    if (location.pathname === '/research/news') return 'news';
    return 'stream';
  };

  const handleTabChange = (value: string) => {
    navigate(`/research/${value}`);
  };

  return (
    <Flex direction="column" gap="4">
      <Tabs.Root value={getActiveTab()} onValueChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Trigger value="stream">
            <Flex gap="2" align="center">
              <Rss size={16} />
              Stream
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="sources">
            <Flex gap="2" align="center">
              <Globe size={16} />
              Feed Sources
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="news">
            <Flex gap="2" align="center">
              <Newspaper size={16} />
              News Feed
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <Outlet />
    </Flex>
  );
}
