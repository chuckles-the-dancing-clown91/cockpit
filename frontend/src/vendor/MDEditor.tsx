import { useMemo } from 'react';
import { cn } from '../lib/cn';

type EditorProps = {
  value?: string;
  onChange?: (value?: string) => void;
  height?: number;
  className?: string;
};

function renderPreview(markdown: string) {
  return markdown
    .split('\n')
    .map((line, idx) => (
      <p key={idx} className="mb-2 last:mb-0 whitespace-pre-wrap">
        {line}
      </p>
    ));
}

export default function MDEditor({ value = '', onChange, height = 320, className }: EditorProps) {
  const preview = useMemo(() => renderPreview(value), [value]);

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)} style={{ minHeight: height }}>
      <textarea
        className="w-full h-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{ minHeight: height }}
      />
      <div className="w-full h-full rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-3 text-sm overflow-auto" style={{ minHeight: height }}>
        <div className="text-[var(--color-text-muted)] text-xs mb-2">Preview</div>
        <div className="prose prose-sm max-w-none text-[var(--color-text-primary)]">{preview}</div>
      </div>
    </div>
  );
}
