import { useEffect } from 'react';
import { Tabs, Card, Flex, Heading, Text, Switch, Box, Select } from '@radix-ui/themes';
import { useSettings, useSetting, useUpdateSetting } from '@/core/hooks/useSettings';
import { SettingKey, SETTINGS_REGISTRY } from '@/shared/settings';
import { toast } from '@/core/lib/toast';
import { useTheme } from '@/core/providers/ThemeProvider';
import { LoadingState } from '@/core/components/ui';
import { Theme } from '@/shared/types';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const updateSetting = useUpdateSetting();
  
  // Get loading state from main settings query
  const { isLoading } = useSettings();

  // Get all settings we'll display
  const appAutoStart = useSetting(SettingKey.AppAutoStart);
  const appMinimizeToTray = useSetting(SettingKey.AppMinimizeToTray);
  const appNotificationsEnabled = useSetting(SettingKey.AppNotificationsEnabled);
  const writingAutoSave = useSetting(SettingKey.WritingAutoSave);
  const writingSpellCheck = useSetting(SettingKey.WritingSpellCheck);
  const storageAutoCleanup = useSetting(SettingKey.StorageAutoCleanup);
  const storageAutoBackup = useSetting(SettingKey.StorageAutoBackup);
  const loggingLevel = useSetting(SettingKey.LoggingLevel);
  const backendTheme = useSetting(SettingKey.AppTheme);

  // Sync backend theme to UI on load (backend takes precedence)
  useEffect(() => {
    if (backendTheme && backendTheme !== theme) {
      setTheme(backendTheme as Theme);
    }
  }, [backendTheme, theme, setTheme]);

  if (isLoading) {
    return <LoadingState />;
  }

  const handleToggle = async (key: SettingKey, value: boolean) => {
    try {
      await updateSetting(key, value);
    } catch (error) {
      toast.error(`Failed to update setting: ${error}`);
    }
  };

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: '900px' }}>
      <Flex justify="between" align="center">
        <Heading size="6">Settings</Heading>
        <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
          Changes save automatically
        </Text>
      </Flex>

      <Tabs.Root defaultValue="general">
        <Tabs.List>
          <Tabs.Trigger value="general">General</Tabs.Trigger>
          <Tabs.Trigger value="writing">Writing</Tabs.Trigger>
          <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
          <Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
        </Tabs.List>

        {/* General Settings */}
        <Tabs.Content value="general">
          <Card style={{ marginTop: 'var(--space-4)' }}>
            <Flex direction="column" gap="4">
              <Heading size="4">General Settings</Heading>

              <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                  <Text weight="medium">
                    {SETTINGS_REGISTRY[SettingKey.AppAutoStart]?.label}
                  </Text>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                    {SETTINGS_REGISTRY[SettingKey.AppAutoStart]?.description}
                  </Text>
                </Flex>
                <Switch
                  checked={appAutoStart === true}
                  onCheckedChange={(checked) => handleToggle(SettingKey.AppAutoStart, checked)}
                />
              </Flex>

              <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                  <Text weight="medium">
                    {SETTINGS_REGISTRY[SettingKey.AppMinimizeToTray]?.label}
                  </Text>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                    {SETTINGS_REGISTRY[SettingKey.AppMinimizeToTray]?.description}
                  </Text>
                </Flex>
                <Switch
                  checked={appMinimizeToTray === true}
                  onCheckedChange={(checked) => handleToggle(SettingKey.AppMinimizeToTray, checked)}
                />
              </Flex>

              <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                  <Text weight="medium">
                    {SETTINGS_REGISTRY[SettingKey.AppNotificationsEnabled]?.label}
                  </Text>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                    {SETTINGS_REGISTRY[SettingKey.AppNotificationsEnabled]?.description}
                  </Text>
                </Flex>
                <Switch
                  checked={appNotificationsEnabled === true}
                  onCheckedChange={(checked) => handleToggle(SettingKey.AppNotificationsEnabled, checked)}
                />
              </Flex>
            </Flex>
          </Card>
        </Tabs.Content>

        {/* Writing Settings */}
        <Tabs.Content value="writing">
          <Card style={{ marginTop: 'var(--space-4)' }}>
            <Flex direction="column" gap="4">
              <Heading size="4">Writing Preferences</Heading>

              <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                  <Text weight="medium">
                    {SETTINGS_REGISTRY[SettingKey.WritingAutoSave]?.label}
                  </Text>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                    {SETTINGS_REGISTRY[SettingKey.WritingAutoSave]?.description}
                  </Text>
                </Flex>
                <Switch
                  checked={writingAutoSave === true}
                  onCheckedChange={(checked) => handleToggle(SettingKey.WritingAutoSave, checked)}
                />
              </Flex>

              <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                  <Text weight="medium">
                    {SETTINGS_REGISTRY[SettingKey.WritingSpellCheck]?.label}
                  </Text>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                    {SETTINGS_REGISTRY[SettingKey.WritingSpellCheck]?.description}
                  </Text>
                </Flex>
                <Switch
                  checked={writingSpellCheck === true}
                  onCheckedChange={(checked) => handleToggle(SettingKey.WritingSpellCheck, checked)}
                />
              </Flex>
            </Flex>
          </Card>
        </Tabs.Content>

        {/* Appearance Settings */}
        <Tabs.Content value="appearance">
          <Card style={{ marginTop: 'var(--space-4)' }}>
            <Flex direction="column" gap="4">
              <Heading size="4">Appearance</Heading>

              <Box>
                <Text weight="medium" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Theme
                </Text>
                <Text size="2" style={{ color: 'var(--color-text-soft)', display: 'block', marginBottom: 'var(--space-3)' }}>
                  Choose your preferred color scheme
                </Text>
                <Select.Root
                  value={theme}
                  onValueChange={async (value: Theme) => {
                    setTheme(value); // Instant UI update via ThemeProvider
                    try {
                      await updateSetting(SettingKey.AppTheme, value); // Persist to backend
                    } catch (error) {
                      toast.error(`Failed to save theme: ${error}`);
                    }
                  }}
                >
                  <Select.Trigger style={{ width: '200px' }} />
                  <Select.Content>
                    <Select.Item value="dark">🌙 Dark</Select.Item>
                    <Select.Item value="light">☀️ Light</Select.Item>
                    <Select.Item value="cyberpunk">⚡ Cyberpunk</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Box>
            </Flex>
          </Card>
        </Tabs.Content>

        {/* Advanced Settings */}
        <Tabs.Content value="advanced">
          <Card style={{ marginTop: 'var(--space-4)' }}>
            <Flex direction="column" gap="4">
              <Heading size="4">Storage & Maintenance</Heading>

              <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                  <Text weight="medium">
                    {SETTINGS_REGISTRY[SettingKey.StorageAutoCleanup]?.label}
                  </Text>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                    {SETTINGS_REGISTRY[SettingKey.StorageAutoCleanup]?.description}
                  </Text>
                </Flex>
                <Switch
                  checked={storageAutoCleanup === true}
                  onCheckedChange={(checked) => handleToggle(SettingKey.StorageAutoCleanup, checked)}
                />
              </Flex>

              <Flex align="center" justify="between">
                <Flex direction="column" gap="1">
                  <Text weight="medium">
                    {SETTINGS_REGISTRY[SettingKey.StorageAutoBackup]?.label}
                  </Text>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                    {SETTINGS_REGISTRY[SettingKey.StorageAutoBackup]?.description}
                  </Text>
                </Flex>
                <Switch
                  checked={storageAutoBackup === true}
                  onCheckedChange={(checked) => handleToggle(SettingKey.StorageAutoBackup, checked)}
                />
              </Flex>

              <Heading size="4" style={{ marginTop: 'var(--space-4)' }}>Logging</Heading>

              <Flex direction="column" gap="1">
                <Text weight="medium">
                  {SETTINGS_REGISTRY[SettingKey.LoggingLevel]?.label}
                </Text>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
                  Current: <Text weight="bold" style={{ textTransform: 'uppercase' }}>{loggingLevel || 'info'}</Text>
                </Text>
                <Text size="2" style={{ color: 'var(--color-text-muted)' }}>
                  Requires app restart to take effect
                </Text>
              </Flex>
            </Flex>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </Flex>
  );
}
