import { Clock, FileText, Hash, Type } from 'lucide-react';

type WritingStatsProps = {
  content: string;
  lastSaved?: Date;
};

function calculateStats(content: string) {
  // Word count - split by whitespace and filter empty strings
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Character counts
  const charCountWithSpaces = content.length;
  const charCountWithoutSpaces = content.replace(/\s/g, '').length;

  // Paragraph count - split by double newlines or more
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  // Reading time estimate (assuming 200 WPM average reading speed)
  const readingTimeMinutes = Math.ceil(wordCount / 200);

  return {
    wordCount,
    charCountWithSpaces,
    charCountWithoutSpaces,
    paragraphCount,
    readingTimeMinutes: readingTimeMinutes || 1, // At least 1 minute
  };
}

export default function WritingStats({ content, lastSaved }: WritingStatsProps) {
  const stats = calculateStats(content);

  const formatLastSaved = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    // Format as date/time for older saves
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-[var(--color-surface-soft)] border-b border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
      {/* Word Count */}
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4" />
        <span className="font-medium">{stats.wordCount.toLocaleString()}</span>
        <span className="text-xs">words</span>
      </div>

      {/* Character Count */}
      <div className="flex items-center gap-2">
        <Hash className="w-4 h-4" />
        <span className="font-medium">{stats.charCountWithSpaces.toLocaleString()}</span>
        <span className="text-xs">chars</span>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          ({stats.charCountWithoutSpaces.toLocaleString()} no spaces)
        </span>
      </div>

      {/* Paragraph Count */}
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4" />
        <span className="font-medium">{stats.paragraphCount}</span>
        <span className="text-xs">paragraph{stats.paragraphCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Reading Time */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span className="font-medium">~{stats.readingTimeMinutes}</span>
        <span className="text-xs">min read</span>
      </div>

      {/* Last Saved - Right aligned */}
      {lastSaved && (
        <>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <span>Last saved:</span>
            <span className="font-medium">{formatLastSaved(lastSaved)}</span>
          </div>
        </>
      )}
    </div>
  );
}
