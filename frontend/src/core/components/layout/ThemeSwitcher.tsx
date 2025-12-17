import { DropdownMenu, Button, Flex } from '@radix-ui/themes';
import { Moon, Sun, Zap } from 'lucide-react';
import { useTheme } from '@/core/providers/ThemeProvider';
import { THEMES } from '@/shared/constants';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={16} />;
      case 'cyberpunk':
        return <Zap size={16} />;
      default:
        return <Moon size={16} />;
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="ghost" size="2">
          <Flex gap="2" align="center">
            {getIcon()}
            <span className="hidden sm:inline">Theme</span>
          </Flex>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Label>Choose Theme</DropdownMenu.Label>
        <DropdownMenu.Separator />
        {THEMES.map((t) => (
          <DropdownMenu.Item
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={theme === t.value ? 'font-semibold' : ''}
          >
            <Flex gap="2" align="center">
              {t.value === 'light' && <Sun size={14} />}
              {t.value === 'dark' && <Moon size={14} />}
              {t.value === 'cyberpunk' && <Zap size={14} />}
              {t.label}
              {theme === t.value && <span className="ml-auto">✓</span>}
            </Flex>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
