import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CreateFeedSourceInput, UpdateFeedSourceInput } from '../../hooks/queries';
import {
  useGetFeedSource,
  useCreateFeedSource,
  useUpdateFeedSource,
} from '../../hooks/queries';
import { useToast } from '../../hooks/use-toast';

interface FeedSourceDialogProps {
  open: boolean;
  onClose: () => void;
  sourceId?: number;
}

export function FeedSourceDialog({ open, onClose, sourceId }: FeedSourceDialogProps) {
  const isEditing = sourceId !== undefined;
  const { data: existingSource } = useGetFeedSource(sourceId || 0);
  const createMutation = useCreateFeedSource();
  const updateMutation = useUpdateFeedSource();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    sourceType: 'newsdata',
    apiKey: '',
    schedule: '0 0/45 * * * * *', // Every 45 minutes
    enabled: true,
    // NewsData config
    language: 'en',
    countries: '',
    categories: '',
    domains: '',
    maxPages: 3,
  });

  useEffect(() => {
    if (isEditing && existingSource) {
      setFormData({
        name: existingSource.name,
        sourceType: existingSource.sourceType,
        apiKey: '', // Don't populate API key for security
        schedule: existingSource.schedule || '0 0/45 * * * * *',
        enabled: existingSource.enabled,
        language: existingSource.config?.newsdata?.language || 'en',
        countries: existingSource.config?.newsdata?.countries?.join(', ') || '',
        categories: existingSource.config?.newsdata?.categories?.join(', ') || '',
        domains: existingSource.config?.newsdata?.domains?.join(', ') || '',
        maxPages: existingSource.config?.newsdata?.maxPages || 3,
      });
    } else if (!isEditing) {
      // Reset form for new source
      setFormData({
        name: '',
        sourceType: 'newsdata',
        apiKey: '',
        schedule: '0 0/45 * * * * *',
        enabled: true,
        language: 'en',
        countries: '',
        categories: '',
        domains: '',
        maxPages: 3,
      });
    }
  }, [isEditing, existingSource, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && sourceId) {
        const input: UpdateFeedSourceInput = {
          name: formData.name,
          enabled: formData.enabled,
          schedule: formData.schedule,
        };

        if (formData.apiKey) {
          input.apiKey = formData.apiKey;
        }

        if (formData.sourceType === 'newsdata') {
          input.config = {
            newsdata: {
              language: formData.language,
              countries: formData.countries.split(',').map((s) => s.trim()).filter(Boolean),
              categories: formData.categories.split(',').map((s) => s.trim()).filter(Boolean),
              domains: formData.domains.split(',').map((s) => s.trim()).filter(Boolean),
              maxPages: formData.maxPages,
            },
          };
        }

        await updateMutation.mutateAsync({ sourceId, input });
        toast({
          title: 'Source Updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const input: CreateFeedSourceInput = {
          name: formData.name,
          sourceType: formData.sourceType,
          apiKey: formData.apiKey,
          schedule: formData.schedule,
        };

        if (formData.sourceType === 'newsdata') {
          input.config = {
            newsdata: {
              language: formData.language,
              countries: formData.countries.split(',').map((s) => s.trim()).filter(Boolean),
              categories: formData.categories.split(',').map((s) => s.trim()).filter(Boolean),
              domains: formData.domains.split(',').map((s) => s.trim()).filter(Boolean),
              maxPages: formData.maxPages,
            },
          };
        }

        await createMutation.mutateAsync(input);
        toast({
          title: 'Source Created',
          description: `${formData.name} has been added successfully.`,
        });
      }

      onClose();
    } catch (err) {
      toast({
        title: isEditing ? 'Update Failed' : 'Creation Failed',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  if (!open) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Feed Source' : 'Add Feed Source'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-1">Source Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., NewsData - Tech News"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium mb-1">Source Type</label>
              <select
                value={formData.sourceType}
                onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="newsdata">NewsData.io</option>
                <option value="reddit" disabled>
                  Reddit (Coming Soon)
                </option>
                <option value="rss" disabled>
                  RSS Feed (Coming Soon)
                </option>
                <option value="twitter" disabled>
                  Twitter/X (Coming Soon)
                </option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              API Key {isEditing && '(leave blank to keep existing)'}
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              required={!isEditing}
              placeholder={isEditing ? '••••••••' : 'Enter API key'}
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sync Schedule</label>
            <select
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="0 0/15 * * * * *">Every 15 minutes</option>
              <option value="0 0/30 * * * * *">Every 30 minutes</option>
              <option value="0 0/45 * * * * *">Every 45 minutes</option>
              <option value="0 0 * * * * *">Every hour</option>
              <option value="0 0 */2 * * * *">Every 2 hours</option>
              <option value="0 0 */6 * * * *">Every 6 hours</option>
              <option value="0 0 0 * * * *">Daily at midnight</option>
            </select>
          </div>

          {/* NewsData Config */}
          {formData.sourceType === 'newsdata' && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">NewsData.io Configuration</h3>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <input
                  type="text"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  placeholder="en"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ISO 639-1 language code (e.g., en, es, fr)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Countries (optional)</label>
                <input
                  type="text"
                  value={formData.countries}
                  onChange={(e) => setFormData({ ...formData, countries: e.target.value })}
                  placeholder="us, gb, ca"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated ISO 3166-1 country codes
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categories (optional)</label>
                <input
                  type="text"
                  value={formData.categories}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                  placeholder="technology, business, science"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated categories
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Domains (optional)</label>
                <input
                  type="text"
                  value={formData.domains}
                  onChange={(e) => setFormData({ ...formData, domains: e.target.value })}
                  placeholder="techcrunch.com, wired.com"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated domain names to include
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Pages</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.maxPages}
                  onChange={(e) =>
                    setFormData({ ...formData, maxPages: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of pages to fetch per sync (1-10)
                </p>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Source' : 'Create Source'}
          </button>
        </div>
      </div>
    </div>
  );
}
