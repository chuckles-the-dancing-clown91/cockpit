import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Separator } from '../ui/Separator';
import { ScrollArea } from '../ui/ScrollArea';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppSettings, useUpdateSettings, type UpdateSettingInput } from '../../hooks/queries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { data: settings, isLoading } = useAppSettings();
  const updateSettings = useUpdateSettings();
  const [pendingChanges, setPendingChanges] = useState<Map<string, unknown>>(new Map());

  const getValue = (category: keyof typeof settings, key: string) => {
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key);
    }
    return settings?.[category]?.[key]?.value;
  };

  const updateValue = (key: string, value: unknown) => {
    setPendingChanges(prev => new Map(prev).set(key, value));
  };

  const handleSave = async () => {
    const inputs: UpdateSettingInput[] = Array.from(pendingChanges.entries()).map(([key, value]) => ({
      key,
      value,
    }));

    try {
      await updateSettings.mutateAsync(inputs);
      setPendingChanges(new Map());
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Settings save error:', error);
    }
  };

  const handleReset = () => {
    setPendingChanges(new Map());
    toast.info('Changes discarded');
  };

  if (isLoading) {
    return (
      <div className="layout-container flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="layout-container flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load settings</p>
      </div>
    );
  }

  const hasChanges = pendingChanges.size > 0;

  return (
    <div className="layout-container">
      <ScrollArea className="h-full">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure application preferences, API keys, and system behavior
            </p>
          </div>

          {/* Save/Reset Actions */}
          {hasChanges && (
            <Card className="p-4 bg-accent/20 border-accent">
              <div className="flex items-center justify-between">
                <p className="text-sm">You have unsaved changes</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={updateSettings.isPending}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* General Settings */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">⚙️ General</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Start</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.general?.['app.auto_start']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('general', 'app.auto_start') as boolean}
                  onCheckedChange={(checked) => updateValue('app.auto_start', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Minimize to Tray</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.general?.['app.minimize_to_tray']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('general', 'app.minimize_to_tray') as boolean}
                  onCheckedChange={(checked) => updateValue('app.minimize_to_tray', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.general?.['app.notifications_enabled']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('general', 'app.notifications_enabled') as boolean}
                  onCheckedChange={(checked) => updateValue('app.notifications_enabled', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">🎨 Appearance</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  {settings.appearance?.['app.theme']?.description}
                </p>
                <Select
                  value={theme}
                  onValueChange={(value) => {
                    // Theme changes are immediate - no pending changes needed
                    setTheme(value as any);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* News Settings */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">📰 News</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="newsApiKey">NewsData.io API Key</Label>
                <p className="text-sm text-muted-foreground">
                  {settings.news?.['news.newsdata_api_key']?.description}
                </p>
                <Input
                  id="newsApiKey"
                  type="password"
                  value={(getValue('news', 'news.newsdata_api_key') as string) || ''}
                  onChange={(e) => updateValue('news.newsdata_api_key', e.target.value)}
                  placeholder="Enter your API key"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.news?.['news.auto_sync']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('news', 'news.auto_sync') as boolean}
                  onCheckedChange={(checked) => updateValue('news.auto_sync', checked)}
                />
              </div>

              {getValue('news', 'news.auto_sync') && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                    <Input
                      id="syncInterval"
                      type="number"
                      min="15"
                      max="1440"
                      value={getValue('news', 'news.sync_interval_minutes') as number}
                      onChange={(e) => updateValue('news.sync_interval_minutes', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="maxArticles">Maximum Articles to Store</Label>
                <Input
                  id="maxArticles"
                  type="number"
                  min="100"
                  max="10000"
                  value={getValue('news', 'news.max_articles') as number}
                  onChange={(e) => updateValue('news.max_articles', parseInt(e.target.value))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-dismiss Read Articles</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.news?.['news.auto_dismiss_read']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('news', 'news.auto_dismiss_read') as boolean}
                  onCheckedChange={(checked) => updateValue('news.auto_dismiss_read', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Writing Settings */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">✍️ Writing</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.writing?.['writing.auto_save']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('writing', 'writing.auto_save') as boolean}
                  onCheckedChange={(checked) => updateValue('writing.auto_save', checked)}
                />
              </div>

              {getValue('writing', 'writing.auto_save') && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label htmlFor="autoSaveDelay">Auto-save Delay (milliseconds)</Label>
                    <Input
                      id="autoSaveDelay"
                      type="number"
                      min="100"
                      max="5000"
                      value={getValue('writing', 'writing.auto_save_delay_ms') as number}
                      onChange={(e) => updateValue('writing.auto_save_delay_ms', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="defaultStatus">Default Status for New Ideas</Label>
                <Select
                  value={getValue('writing', 'writing.default_status') as string}
                  onValueChange={(value) => updateValue('writing.default_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="stalled">Stalled</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Spell Check</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.writing?.['writing.spell_check']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('writing', 'writing.spell_check') as boolean}
                  onCheckedChange={(checked) => updateValue('writing.spell_check', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Advanced Settings */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">🔧 Advanced</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Cleanup</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.advanced?.['storage.auto_cleanup']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('advanced', 'storage.auto_cleanup') as boolean}
                  onCheckedChange={(checked) => updateValue('storage.auto_cleanup', checked)}
                />
              </div>

              {getValue('advanced', 'storage.auto_cleanup') && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label htmlFor="cleanupDays">Days to Keep Old Articles</Label>
                    <Input
                      id="cleanupDays"
                      type="number"
                      min="7"
                      max="365"
                      value={getValue('advanced', 'storage.cleanup_days') as number}
                      onChange={(e) => updateValue('storage.cleanup_days', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.advanced?.['storage.auto_backup']?.description}
                  </p>
                </div>
                <Switch
                  checked={getValue('advanced', 'storage.auto_backup') as boolean}
                  onCheckedChange={(checked) => updateValue('storage.auto_backup', checked)}
                />
              </div>

              {getValue('advanced', 'storage.auto_backup') && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label htmlFor="backupInterval">Backup Interval (days)</Label>
                    <Input
                      id="backupInterval"
                      type="number"
                      min="1"
                      max="30"
                      value={getValue('advanced', 'storage.backup_interval_days') as number}
                      onChange={(e) => updateValue('storage.backup_interval_days', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="maxBackups">Maximum Backups to Keep</Label>
                    <Input
                      id="maxBackups"
                      type="number"
                      min="1"
                      max="50"
                      value={getValue('advanced', 'storage.max_backup_count') as number}
                      onChange={(e) => updateValue('storage.max_backup_count', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="logLevel">Log Level</Label>
                <Select
                  value={getValue('advanced', 'logging.level') as string}
                  onValueChange={(value) => updateValue('logging.level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trace">Trace</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="maxLogSize">Max Log File Size (MB)</Label>
                <Input
                  id="maxLogSize"
                  type="number"
                  min="1"
                  max="500"
                  value={getValue('advanced', 'logging.max_file_size_mb') as number}
                  onChange={(e) => updateValue('logging.max_file_size_mb', parseInt(e.target.value))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="maxLogFiles">Max Log Files to Keep</Label>
                <Input
                  id="maxLogFiles"
                  type="number"
                  min="1"
                  max="20"
                  value={getValue('advanced', 'logging.max_files') as number}
                  onChange={(e) => updateValue('logging.max_files', parseInt(e.target.value))}
                />
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
