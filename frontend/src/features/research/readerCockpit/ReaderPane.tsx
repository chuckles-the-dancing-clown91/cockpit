import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box, Button, Flex, Text } from '@radix-ui/themes';
import MarkdownPreview from '@uiw/react-markdown-preview';

import { buildCitation } from './utils/citation';
import { slugify } from './utils/slugify';

type ReaderPaneProps = {
  title?: string;
  excerpt?: string | null;
  contentMd?: string | null;
  referenceId?: number | null;
  onSelectionChange: (selection: string) => void;
  onCopyHeadingLink?: (anchor: string) => void;
  onOpenInternalLink?: (target: string) => void;
  onOpenLivePage?: () => void;
  hasError?: boolean;
};

export function ReaderPane({
  title,
  excerpt,
  contentMd,
  referenceId,
  onSelectionChange,
  onCopyHeadingLink,
  onOpenInternalLink,
  onOpenLivePage,
  hasError,
}: ReaderPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const content = useMemo(() => contentMd?.trim() ?? '', [contentMd]);

  const ensureHeadingAnchors = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('h1, h2, h3, h4').forEach((node) => {
      const heading = node as HTMLElement;
      if (heading.id) return;
      const slug = slugify(heading.innerText || heading.textContent || '');
      if (slug) heading.id = slug;
    });
  }, []);

  useEffect(() => {
    ensureHeadingAnchors();
  }, [content, ensureHeadingAnchors]);

  const handleSelection = useCallback(() => {
    const container = containerRef.current;
    const selection = window.getSelection();
    if (!container || !selection) return;
    if (!selection.anchorNode || !container.contains(selection.anchorNode)) return;
    const text = selection.toString().trim();
    onSelectionChange(text);
  }, [onSelectionChange]);

  const handleCopyHeading = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const target = event.currentTarget.getAttribute('data-anchor');
    if (!target) return;
    onCopyHeadingLink?.(target);
  }, [onCopyHeadingLink]);

  const handleLinkClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target) return;
    if (target.tagName.toLowerCase() !== 'a') return;
    const href = (target as HTMLAnchorElement).getAttribute('href');
    if (!href) return;
    if (href.startsWith('[[') && href.endsWith(']]')) {
      event.preventDefault();
      onOpenInternalLink?.(href);
    }
  }, [onOpenInternalLink]);

  if (hasError) {
    return (
      <Box
        style={{
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-5)',
        }}
      >
        <Flex direction="column" gap="3">
          <Text size="3" weight="medium">
            Reader mode failed to load.
          </Text>
          <Text size="2" color="gray">
            Try refreshing the snapshot or open the live page.
          </Text>
          {onOpenLivePage && (
            <Button variant="soft" onClick={onOpenLivePage}>
              Open Live Page
            </Button>
          )}
        </Flex>
      </Box>
    );
  }

  if (!content) {
    return (
      <Box
        style={{
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-5)',
        }}
      >
        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">
            Paste a URL to load Reader Mode
          </Text>
          <Text size="2" color="gray">
            Reader Cockpit extracts a clean snapshot and keeps notes beside it.
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Flex direction="column" gap="1">
          {title && (
            <Text size="5" weight="bold">
              {title}
            </Text>
          )}
          {excerpt && (
            <Text size="2" color="gray">
              {excerpt}
            </Text>
          )}
          {referenceId && (
            <Text size="1" color="gray">
              {buildCitation(referenceId)}
            </Text>
          )}
        </Flex>
      </Box>
      <Box
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: 'var(--space-5)',
        }}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
        onClick={handleLinkClick}
      >
        <MarkdownPreview
          source={content}
          style={{ background: 'transparent' }}
        />
      </Box>
      {onCopyHeadingLink && (
        <Box style={{ display: 'none' }}>
          <button data-anchor="" onClick={handleCopyHeading} type="button" />
        </Box>
      )}
    </Box>
  );
}
