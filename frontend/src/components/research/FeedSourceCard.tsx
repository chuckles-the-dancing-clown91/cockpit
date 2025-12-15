import { useState } from 'react';
import {
  RefreshCw,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Newspaper,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { FeedSource } from '../../hooks/queries';
import {
  useToggleFeedSource,
  useDeleteFeedSource,
  useSyncFeedSourceNow,
  useTestFeedSourceConnection,
} from '../../hooks/queries';
import { useToast } from '../../hooks/use-toast';

interface FeedSourceCardProps {
  source: FeedSource;
  onEdit: () => void;
}

export function FeedSourceCard({ source, onEdit }: FeedSourceCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const toggle = useToggleFeedSource();
  const deleteSource = useDeleteFeedSource();
  const syncNow = useSyncFeedSourceNow();
  const testConnection = useTestFeedSourceConnection();
  const { toast } = useToast();

  const handleToggle = async () => {
    try {
      await toggle.mutateAsync({ sourceId: source.id, enabled: !source.enabled });
      toast({
        title: source.enabled ? 'Source Disabled' : 'Source Enabled',
        description: `${source.name} has been ${source.enabled ? 'disabled' : 'enabled'}.`,
      });
    } catch (err) {
      toast({
        title: 'Toggle Failed',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncNow.mutateAsync(source.id);
      if (result.success) {
        toast({
          title: 'Sync Complete',
          description: `Added ${result.articlesAdded} articles from ${result.sourceName}.`,
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Sync Error',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync(source.id);
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.quotaRemaining
            ? `API key valid. ${result.quotaRemaining} calls remaining.`
            : result.message,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Test Failed',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSource.mutateAsync(source.id);
      toast({
        title: 'Source Deleted',
        description: `${source.name} has been removed.`,
      });
      setShowDeleteConfirm(false);
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  const getSourceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      newsdata: 'bg-blue-500',
      reddit: 'bg-orange-500',
      rss: 'bg-green-500',
      twitter: 'bg-sky-500',
      custom: 'bg-purple-500',
    };
    return colors[type.toLowerCase()] || 'bg-gray-500';
  };

  const healthStatus = source.errorCount > 0 ? 'error' : 'healthy';
  const isRateLimited =
    source.apiQuotaDaily && source.apiCallsToday >= source.apiQuotaDaily;

  return (
    <div className="border rounded-lg bg-card p-4 hover:shadow-md transition-shadow relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={`${getSourceTypeColor(source.sourceType)} text-white px-3 py-1 rounded-md text-sm font-medium`}
          >
            {source.sourceType.charAt(0).toUpperCase() + source.sourceType.slice(1)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{source.name}</h3>
            {source.schedule && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                <span>{parseCron(source.schedule)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={toggle.isPending}
          className={`p-2 rounded-md transition-colors ${
            source.enabled
              ? 'text-green-600 hover:bg-green-50'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
          title={source.enabled ? 'Disable source' : 'Enable source'}
        >
          {source.enabled ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1">
          {healthStatus === 'healthy' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span className="text-muted-foreground">
            {healthStatus === 'healthy' ? 'Healthy' : `${source.errorCount} errors`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{source.articleCount} articles</span>
        </div>

        {source.apiQuotaDaily && (
          <div className="flex items-center gap-1">
            <span
              className={`text-xs ${
                isRateLimited ? 'text-red-600 font-semibold' : 'text-muted-foreground'
              }`}
            >
              {source.apiCallsToday}/{source.apiQuotaDaily} API calls
            </span>
          </div>
        )}
      </div>

      {/* Last Sync */}
      {source.lastSyncAt && (
        <div className="text-xs text-muted-foreground mb-3">
          Last synced {formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true })}
        </div>
      )}

      {/* Error Message */}
      {source.lastError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
          {source.lastError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t">
        <button
          onClick={handleSync}
          disabled={syncNow.isPending || !source.enabled || isRateLimited}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncNow.isPending ? 'animate-spin' : ''}`} />
          Sync Now
        </button>

        <button
          onClick={handleTestConnection}
          disabled={testConnection.isPending || !source.hasApiKey}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Test
        </button>

        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-accent transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>

        <div className="flex-1" />

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete source"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={handleDelete}
              disabled={deleteSource.isPending}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 text-xs border rounded hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to parse cron expressions into human-readable text
function parseCron(cron: string): string {
  // Simple patterns - extend as needed
  if (cron === '0 0/45 * * * * *') return 'Every 45 minutes';
  if (cron === '0 0/30 * * * * *') return 'Every 30 minutes';
  if (cron === '0 0 * * * * *') return 'Every hour';
  if (cron === '0 0 0 * * * *') return 'Daily at midnight';
  
  // Parse minutes
  const parts = cron.split(' ');
  if (parts.length >= 2 && parts[1].includes('/')) {
    const interval = parts[1].split('/')[1];
    return `Every ${interval} minutes`;
  }
  
  return cron; // Fallback to raw cron
}
