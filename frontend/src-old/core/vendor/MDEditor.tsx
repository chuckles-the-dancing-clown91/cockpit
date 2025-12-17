import { useMemo, useRef } from 'react';
import { cn } from '@/core/lib/cn';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, Code, Image, FileCode, Quote, Sigma } from 'lucide-react';

type EditorProps = {
  value?: string;
  onChange?: (value?: string) => void;
  height?: number | string;
  className?: string;
  hideToolbar?: boolean;
  preview?: 'edit' | 'live';
};

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeLanguage = '';
  let inMathBlock = false;
  let mathBlockContent: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div key={`code-${idx}`} className="my-4 rounded-lg overflow-hidden border border-[var(--color-border)]">
            {codeLanguage && (
              <div className="bg-[var(--color-surface-soft)] px-3 py-1 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                {codeLanguage}
              </div>
            )}
            <pre className="bg-[var(--color-bg)] p-4 overflow-x-auto">
              <code className="text-sm font-mono text-[var(--color-text-primary)]">
                {codeBlockContent.join('\n')}
              </code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeLanguage = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Math blocks ($$)
    if (line.trim() === '$$') {
      if (inMathBlock) {
        elements.push(
          <div key={`math-${idx}`} className="my-4 p-4 bg-[var(--color-surface-soft)] rounded-lg border border-[var(--color-border)] text-center font-serif text-lg">
            {mathBlockContent.join('\n')}
          </div>
        );
        inMathBlock = false;
        mathBlockContent = [];
      } else {
        inMathBlock = true;
      }
      continue;
    }

    if (inMathBlock) {
      mathBlockContent.push(line);
      continue;
    }

    // Headers (with Reddit/Substack styling)
    if (line.startsWith('### ')) {
      elements.push(<h3 key={idx} className="text-xl font-semibold mb-3 mt-6 text-[var(--color-text-primary)] leading-tight">{line.slice(4)}</h3>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={idx} className="text-2xl font-bold mb-4 mt-8 text-[var(--color-text-primary)] leading-tight">{line.slice(3)}</h2>);
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={idx} className="text-3xl font-bold mb-5 mt-8 text-[var(--color-text-primary)] leading-tight">{line.slice(2)}</h1>);
      continue;
    }

    // Block quotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={idx} className="border-l-4 border-[var(--color-accent)] pl-4 py-2 my-3 italic text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] rounded-r">
          {line.slice(2)}
        </blockquote>
      );
      continue;
    }
    
    // Lists
    if (line.match(/^\d+\.\s/)) {
      elements.push(<li key={idx} className="ml-6 mb-2 list-decimal leading-relaxed">{processInline(line.replace(/^\d+\.\s/, ''))}</li>);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={idx} className="ml-6 mb-2 list-disc leading-relaxed">{processInline(line.slice(2))}</li>);
      continue;
    }

    // Images
    if (line.match(/^!\[([^\]]*)\]\(([^)]+)\)/)) {
      const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        elements.push(
          <figure key={idx} className="my-6">
            <img 
              src={match[2]} 
              alt={match[1]} 
              className="w-full rounded-lg border border-[var(--color-border)] shadow-sm"
            />
            {match[1] && (
              <figcaption className="text-center text-sm text-[var(--color-text-muted)] mt-2 italic">
                {match[1]}
              </figcaption>
            )}
          </figure>
        );
        continue;
      }
    }
    
    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={idx} className="h-2" />);
      continue;
    }
    
    // Regular paragraphs (with inline formatting)
    elements.push(
      <p key={idx} className="mb-4 last:mb-0 leading-relaxed text-[var(--color-text-primary)]" dangerouslySetInnerHTML={{ __html: processInline(line) }} />
    );
  }

  return elements;
}

function processInline(text: string): string {
  // Inline code
  let processed = text.replace(/`([^`]+)`/g, '<code class="bg-[var(--color-surface-soft)] px-1.5 py-0.5 rounded text-sm font-mono border border-[var(--color-border-subtle)]">$1</code>');
  
  // Inline math ($)
  processed = processed.replace(/\$([^$]+)\$/g, '<span class="font-serif italic">$1</span>');
  
  // Bold and italic
  processed = processed
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    .replace(/__([^_]+)__/g, '<strong class="font-semibold">$1</strong>')
    .replace(/_([^_]+)_/g, '<em class="italic">$1</em>');
  
  // Links (Reddit/Substack style)
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g, 
    '<a href="$2" class="text-[var(--color-accent)] hover:text-[var(--color-accent-strong)] underline decoration-2 underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  return processed;
}

export default function MDEditor({ value = '', onChange, height = 320, className, hideToolbar = false, preview = 'live' }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renderedPreview = useMemo(() => renderMarkdown(value), [value]);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange?.(newText);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const insertBlock = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + '\n' + text + '\n' + value.substring(start);
    onChange?.(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newPos = start + text.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const buttons = [
    { icon: Bold, label: 'Bold', action: () => insertText('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insertText('*', '*') },
    { icon: Heading1, label: 'H1', action: () => insertText('# ') },
    { icon: Heading2, label: 'H2', action: () => insertText('## ') },
    { icon: Heading3, label: 'H3', action: () => insertText('### ') },
    { icon: List, label: 'Bullet List', action: () => insertText('- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertText('1. ') },
    { icon: Quote, label: 'Quote', action: () => insertText('> ') },
    { icon: LinkIcon, label: 'Link', action: () => insertText('[', '](url)') },
    { icon: Code, label: 'Inline Code', action: () => insertText('`', '`') },
    { icon: FileCode, label: 'Code Block', action: () => insertBlock('```language\ncode here\n```') },
    { icon: Sigma, label: 'Math/LaTeX', action: () => insertText('$', '$') },
    { icon: Image, label: 'Image', action: () => insertText('![alt text](', ')') },
  ];

  const heightStyle = typeof height === 'number' ? height : height;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {!hideToolbar && (
        <div className="flex items-center gap-1 p-2 border border-[var(--color-border)] border-b-0 rounded-t-[var(--radius-card)] bg-[var(--color-surface-soft)] flex-shrink-0">
          {buttons.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.label}
                onClick={btn.action}
                title={btn.label}
                className="p-1.5 rounded hover:bg-[var(--color-accent-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}
      <div className={cn('grid gap-3 flex-1 min-h-0', preview === 'live' ? 'grid-cols-2' : 'grid-cols-1')}>
        <textarea
          ref={textareaRef}
          className={cn(
            'w-full h-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono overflow-auto',
            hideToolbar ? 'rounded-[var(--radius-card)]' : 'rounded-bl-[var(--radius-card)] rounded-tr-none rounded-tl-none'
          )}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          style={{ resize: 'none' }}
        />
        {preview === 'live' && (
          <div 
            className={cn(
              'w-full h-full border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-6 overflow-auto',
              hideToolbar ? 'rounded-[var(--radius-card)]' : 'rounded-br-[var(--radius-card)] rounded-tr-none rounded-tl-none'
            )}
          >
            <div className="text-[var(--color-text-muted)] text-xs mb-4 uppercase tracking-wide">Preview</div>
            <article className="prose prose-lg max-w-none">
              <div className="text-base leading-relaxed">{renderedPreview}</div>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
