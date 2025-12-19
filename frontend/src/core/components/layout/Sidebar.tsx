import { Flex, Box, IconButton, Text, Separator } from '@radix-ui/themes';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Library, BookOpen, FileEdit, Lightbulb, Archive, Rss, Globe, Newspaper, Settings, Database, FileText, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  domain: 'writing' | 'research' | 'system';
}

export function Sidebar({ domain }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const menuItems = {
    writing: [
      { path: '/writing/library', icon: Library, label: 'Library' },
      { path: '/writing/editor', icon: BookOpen, label: 'Editor' },
      { path: '/writing/ideas', icon: Lightbulb, label: 'Ideas' },
      { path: '/writing/archive', icon: Archive, label: 'Archive' },
    ],
    research: [
      { path: '/research/stream', icon: Rss, label: 'Stream' },
      { path: '/research/sources', icon: Globe, label: 'Feed Sources' },
      { path: '/research/news', icon: Newspaper, label: 'News Feed' },
    ],
    system: [
      { path: '/system/settings', icon: Settings, label: 'Settings' },
      { path: '/system/storage', icon: Database, label: 'Storage' },
      { path: '/system/logs', icon: FileText, label: 'Logs' },
      { path: '/system/tasks', icon: Calendar, label: 'Tasks' },
    ],
  };

  const items = menuItems[domain];

  return (
    <Box
      style={{
        width: collapsed ? '60px' : '200px',
        height: '100%',
        borderRight: '1px solid var(--gray-a6)',
        backgroundColor: 'var(--color-background)',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Collapse/Expand Button */}
      <Flex justify="end" p="2">
        <IconButton
          variant="ghost"
          size="2"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </IconButton>
      </Flex>

      <Separator size="4" />

      {/* Menu Items */}
      <Flex direction="column" gap="1" p="2" style={{ flex: 1 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: collapsed ? '8px' : '8px 12px',
                borderRadius: 'var(--radius-2)',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--accent-a3)' : 'transparent',
                color: isActive ? 'var(--accent-11)' : 'var(--gray-11)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
              className="sidebar-item"
            >
              <Icon size={18} />
              {!collapsed && <Text size="2">{item.label}</Text>}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
