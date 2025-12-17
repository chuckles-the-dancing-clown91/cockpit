import React from 'react';
import { cn } from '@/core/lib/cn';

type Props = {
  source?: string;
  className?: string;
};

export default function MarkdownPreview({ source = '', className }: Props) {
  return (
    <div className={cn('prose prose-sm max-w-none text-[var(--color-text-primary)]', className)}>
      {source.split('\n').map((line, idx) => (
        <p key={idx} className="mb-2 last:mb-0 whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  );
}
