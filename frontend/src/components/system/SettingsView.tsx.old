import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Separator } from '../ui/Separator';
import { ScrollArea } from '../ui/ScrollArea';
import { useTheme } from '../../theme/ThemeProvider';

// Mock settings data - will be replaced with backend integration
const defaultSettings = {
  // App Preferences
  appName: 'Cockpit',
  autoSave: true,
  autoSaveInterval: 30, // seconds
  startupMode: 'writing' as 'writing' | 'research' | 'system',
  
  // News API
  newsApiKey: '',
  newsApiKeySet: false,
  newsFetchInterval: 15, // minutes
  maxArticlesPerSource: 50,
  
  // Logging
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
  logRetentionDays: 30,
  enableFileLogging: true,
  enableConsoleLogging: true,
  
  // Storage
  databasePath: './storage/data/db.sql',
  autoBackup: true,
  backupInterval: 24, // hours
  maxBackups: 7,
  autoCleanup: true,
  cleanupThreshold: 90, // days
  
  // Theme
  defaultTheme: 'dark' as 'dark' | 'cyberpunk' | 'light',
  
  // Notifications
  enableNotifications: true,
  notifyOnNewArticles: true,
  notifyOnErrors: true,
};

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(defaultSettings);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // TODO: Call backend to save settings
    console.log('Saving settings:', settings);
    setHasUnsavedChanges(false);
    // In future: invoke('update_app_settings', { settings })
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasUnsavedChanges(false);
  };

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
          {hasUnsavedChanges && (
            <Card className="p-4 bg-accent/20 border-accent">
              <div className="flex items-center justify-between">
                <p className="text-sm">You have unsaved changes</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* App Preferences */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">⚙️ App Preferences</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input
                  id="appName"
                  value={settings.appName}
                  onChange={(e) => updateSetting('appName', e.target.value)}
                  placeholder="Cockpit"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoSave">Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save content while editing
                  </p>
                </div>
                <Switch
                  id="autoSave"
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => updateSetting('autoSave', checked)}
                />
              </div>

              {settings.autoSave && (
                <div className="grid gap-2 pl-6">
                  <Label htmlFor="autoSaveInterval">Auto-save interval (seconds)</Label>
                  <Input
                    id="autoSaveInterval"
                    type="number"
                    min="5"
                    max="300"
                    value={settings.autoSaveInterval}
                    onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="startupMode">Default mode on startup</Label>
                <Select
                  value={settings.startupMode}
                  onValueChange={(value) => updateSetting('startupMode', value as any)}
                >
                  <SelectTrigger id="startupMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="writing">Writing</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* News API Configuration */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">🔑 News API</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="newsApiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="newsApiKey"
                    type={apiKeyVisible ? 'text' : 'password'}
                    value={settings.newsApiKey}
                    onChange={(e) => updateSetting('newsApiKey', e.target.value)}
                    placeholder={settings.newsApiKeySet ? '••••••••••••••••' : 'Enter your News API key'}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  >
                    {apiKeyVisible ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    newsapi.org
                  </a>
                </p>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="newsFetchInterval">Fetch interval (minutes)</Label>
                <Input
                  id="newsFetchInterval"
                  type="number"
                  min="5"
                  max="120"
                  value={settings.newsFetchInterval}
                  onChange={(e) => updateSetting('newsFetchInterval', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  How often to check for new articles
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="maxArticlesPerSource">Max articles per source</Label>
                <Input
                  id="maxArticlesPerSource"
                  type="number"
                  min="10"
                  max="200"
                  value={settings.maxArticlesPerSource}
                  onChange={(e) => updateSetting('maxArticlesPerSource', parseInt(e.target.value))}
                />
              </div>
            </div>
          </Card>

          {/* Logging Configuration */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">📄 Logging</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="logLevel">Log level</Label>
                <Select
                  value={settings.logLevel}
                  onValueChange={(value) => updateSetting('logLevel', value as any)}
                >
                  <SelectTrigger id="logLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug (Most verbose)</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="error">Error (Least verbose)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Lower levels show more detailed information
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableFileLogging">File logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Write logs to files
                  </p>
                </div>
                <Switch
                  id="enableFileLogging"
                  checked={settings.enableFileLogging}
                  onCheckedChange={(checked) => updateSetting('enableFileLogging', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableConsoleLogging">Console logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Show logs in developer console
                  </p>
                </div>
                <Switch
                  id="enableConsoleLogging"
                  checked={settings.enableConsoleLogging}
                  onCheckedChange={(checked) => updateSetting('enableConsoleLogging', checked)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logRetentionDays">Log retention (days)</Label>
                <Input
                  id="logRetentionDays"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.logRetentionDays}
                  onChange={(e) => updateSetting('logRetentionDays', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Automatically delete logs older than this
                </p>
              </div>
            </div>
          </Card>

          {/* Storage Configuration */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">💾 Storage</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="databasePath">Database path</Label>
                <Input
                  id="databasePath"
                  value={settings.databasePath}
                  onChange={(e) => updateSetting('databasePath', e.target.value)}
                  readOnly
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Location of the SQLite database file
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBackup">Auto-backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup database
                  </p>
                </div>
                <Switch
                  id="autoBackup"
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                />
              </div>

              {settings.autoBackup && (
                <>
                  <div className="grid gap-2 pl-6">
                    <Label htmlFor="backupInterval">Backup interval (hours)</Label>
                    <Input
                      id="backupInterval"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.backupInterval}
                      onChange={(e) => updateSetting('backupInterval', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2 pl-6">
                    <Label htmlFor="maxBackups">Max backups to keep</Label>
                    <Input
                      id="maxBackups"
                      type="number"
                      min="1"
                      max="50"
                      value={settings.maxBackups}
                      onChange={(e) => updateSetting('maxBackups', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoCleanup">Auto-cleanup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically remove old data
                  </p>
                </div>
                <Switch
                  id="autoCleanup"
                  checked={settings.autoCleanup}
                  onCheckedChange={(checked) => updateSetting('autoCleanup', checked)}
                />
              </div>

              {settings.autoCleanup && (
                <div className="grid gap-2 pl-6">
                  <Label htmlFor="cleanupThreshold">Cleanup threshold (days)</Label>
                  <Input
                    id="cleanupThreshold"
                    type="number"
                    min="7"
                    max="365"
                    value={settings.cleanupThreshold}
                    onChange={(e) => updateSetting('cleanupThreshold', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Delete articles and archived content older than this
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Theme Configuration */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">🎨 Theme</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="defaultTheme">Default theme</Label>
                <Select
                  value={theme}
                  onValueChange={(value) => {
                    setTheme(value as any);
                    updateSetting('defaultTheme', value as any);
                  }}
                >
                  <SelectTrigger id="defaultTheme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Theme Preview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="h-20 rounded-lg border-2 border-border bg-[hsl(240,6%,10%)] flex items-center justify-center text-white text-sm">
                    Dark
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg border-2 border-border bg-[hsl(20,100%,10%)] flex items-center justify-center text-orange-500 text-sm">
                    Cyberpunk
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-20 rounded-lg border-2 border-border bg-[hsl(210,40%,98%)] flex items-center justify-center text-gray-900 text-sm">
                    Light
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">🔔 Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableNotifications">Enable notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show system notifications
                  </p>
                </div>
                <Switch
                  id="enableNotifications"
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
                />
              </div>

              {settings.enableNotifications && (
                <>
                  <div className="flex items-center justify-between pl-6">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifyOnNewArticles">New articles</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when new articles are fetched
                      </p>
                    </div>
                    <Switch
                      id="notifyOnNewArticles"
                      checked={settings.notifyOnNewArticles}
                      onCheckedChange={(checked) => updateSetting('notifyOnNewArticles', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between pl-6">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifyOnErrors">Errors</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when errors occur
                      </p>
                    </div>
                    <Switch
                      id="notifyOnErrors"
                      checked={settings.notifyOnErrors}
                      onCheckedChange={(checked) => updateSetting('notifyOnErrors', checked)}
                    />
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
}
