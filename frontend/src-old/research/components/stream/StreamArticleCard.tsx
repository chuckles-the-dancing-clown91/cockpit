import { useState } from 'react';
import { Star, ExternalLink, X, Clock, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToggleStarArticle, useDismissArticle, type NewsArticle } from '../../../hooks/queries';

interface StreamArticleCardProps {
  article: NewsArticle;
}

export default function StreamArticleCard({ article }: StreamArticleCardProps) {
  const [imageError, setImageError] = useState(false);
  const toggleStar = useToggleStarArticle();
  const dismissArticle = useDismissArticle();

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStar.mutate({ id: article.id, starred: !article.isStarred });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Dismiss this article? You won\'t see it in the stream again.')) {
      dismissArticle.mutate(article.id);
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    if (article.url) {
      window.open(article.url, '_blank');
    }
  };

  return (
    <div
      onClick={handleOpen}
      className="group relative bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-all cursor-pointer hover:shadow-[var(--shadow-card-hover)]"
    >
      {/* Image */}
      {article.imageUrl && !imageError ? (
        <div className="relative w-full h-48 bg-[var(--color-surface-soft)] overflow-hidden">
          <img
            src={article.imageUrl}
            alt={article.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Action buttons overlay */}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={handleStar}
              disabled={toggleStar.isPending}
              className={`p-1.5 rounded-full backdrop-blur-sm transition-all ${
                article.isStarred
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-black/40 text-white hover:bg-[var(--color-accent)]'
              }`}
            >
              <Star className="w-4 h-4" fill={article.isStarred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleDismiss}
              disabled={dismissArticle.isPending}
              className="p-1.5 rounded-full bg-black/40 text-white hover:bg-[var(--color-danger)] backdrop-blur-sm transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-32 bg-gradient-to-br from-[var(--color-surface-soft)] to-[var(--color-surface)] flex items-center justify-center">
          <ExternalLink className="w-8 h-8 text-[var(--color-text-muted)] opacity-30" />
          
          {/* Action buttons for non-image cards */}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={handleStar}
              disabled={toggleStar.isPending}
              className={`p-1.5 rounded-full transition-all ${
                article.isStarred
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent)] hover:text-white border border-[var(--color-border)]'
              }`}
            >
              <Star className="w-4 h-4" fill={article.isStarred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleDismiss}
              disabled={dismissArticle.isPending}
              className="p-1.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-danger)] hover:text-white border border-[var(--color-border)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Source and Date */}
        <div className="flex items-center justify-between gap-2">
          {article.sourceName && typeof article.sourceName === 'string' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              {article.sourceName}
            </span>
          )}
          {article.publishedAt && typeof article.publishedAt === 'string' && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-soft)]">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[var(--color-text-primary)] line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
          {article.title || 'Untitled'}
        </h3>

        {/* Excerpt */}
        {article.excerpt && typeof article.excerpt === 'string' && (
          <p className="text-sm text-[var(--color-text-soft)] line-clamp-3">
            {article.excerpt}
          </p>
        )}

        {/* Tags */}
        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-[var(--color-text-muted)]" />
            {article.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs text-[var(--color-text-soft)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded"
              >
                {typeof tag === 'string' ? tag : ''}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="text-xs text-[var(--color-text-soft)]">
                +{article.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            {article.isRead && (
              <span className="text-xs text-[var(--color-text-soft)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded">
                Read
              </span>
            )}
            {article.category && typeof article.category === 'string' && (
              <span className="text-xs text-[var(--color-text-soft)]">
                {article.category}
              </span>
            )}
          </div>
          
          <button
            onClick={handleOpen}
            className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium group-hover:gap-2 transition-all"
          >
            Open
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {(toggleStar.isPending || dismissArticle.isPending) && (
        <div className="absolute inset-0 bg-[var(--color-surface)]/60 backdrop-blur-[1px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
