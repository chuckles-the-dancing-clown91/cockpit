/**
 * WritingMetaPanel - Right sidebar for writing metadata
 */

import { Card, Flex, Text, TextField, Select, Button } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import type { Writing, WritingType, WritingStatus } from '../../types';
import { useUpdateWritingMeta, usePublishWriting } from '../../hooks/useWriting';

interface WritingMetaPanelProps {
  writing: Writing;
}

export function WritingMetaPanel({ writing }: WritingMetaPanelProps) {
  const updateMeta = useUpdateWritingMeta(writing.id);
  const publish = usePublishWriting(writing.id);

  const [title, setTitle] = useState(writing.title);
  const [slug, setSlug] = useState(writing.slug || '');
  const [excerpt, setExcerpt] = useState(writing.excerpt || '');
  const [writingType, setWritingType] = useState<WritingType>(writing.writingType);
  const [status, setStatus] = useState<WritingStatus>(writing.status);
  const [tags, setTags] = useState(writing.tags || '');
  const [seriesName, setSeriesName] = useState(writing.seriesName || '');
  const [seriesPart, setSeriesPart] = useState<string>(writing.seriesPart?.toString() || '');
  
  const [dirty, setDirty] = useState(false);

  // Reset when writing changes
  useEffect(() => {
    setTitle(writing.title);
    setSlug(writing.slug || '');
    setExcerpt(writing.excerpt || '');
    setWritingType(writing.writingType);
    setStatus(writing.status);
    setTags(writing.tags || '');
    setSeriesName(writing.seriesName || '');
    setSeriesPart(writing.seriesPart?.toString() || '');
    setDirty(false);
  }, [writing.id, writing.updatedAt]);

  const handleSave = () => {
    updateMeta.mutate({
      title,
      slug: slug || null,
      excerpt: excerpt || null,
      writingType,
      status,
      tags: tags || null,
      seriesName: seriesName || null,
      seriesPart: seriesPart ? parseInt(seriesPart, 10) : null,
    });
    setDirty(false);
  };

  const handlePublish = () => {
    publish.mutate();
  };

  return (
    <Flex direction="column" gap="3" style={{ padding: '12px' }}>
      <Card>
        <Flex direction="column" gap="3">
          <Text size="4" weight="bold">Metadata</Text>

          <div>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Title</Text>
            <TextField.Root
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              placeholder="Title…"
            />
          </div>

          <div>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Slug (URL)</Text>
            <TextField.Root
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setDirty(true); }}
              placeholder="my-article-slug"
            />
          </div>

          <div>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Excerpt</Text>
            <TextField.Root
              value={excerpt}
              onChange={(e) => { setExcerpt(e.target.value); setDirty(true); }}
              placeholder="Short description…"
            />
          </div>

          <Flex gap="2">
            <div style={{ flex: 1 }}>
              <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Type</Text>
              <Select.Root
                value={writingType}
                onValueChange={(v) => { setWritingType(v as WritingType); setDirty(true); }}
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value="article">Article</Select.Item>
                  <Select.Item value="chapter">Chapter</Select.Item>
                  <Select.Item value="book">Book</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div style={{ flex: 1 }}>
              <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Status</Text>
              <Select.Root
                value={status}
                onValueChange={(v) => { setStatus(v as WritingStatus); setDirty(true); }}
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value="draft">Draft</Select.Item>
                  <Select.Item value="in_progress">In progress</Select.Item>
                  <Select.Item value="review">Review</Select.Item>
                  <Select.Item value="published">Published</Select.Item>
                  <Select.Item value="archived">Archived</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
          </Flex>

          <Button
            disabled={!dirty || updateMeta.isPending}
            onClick={handleSave}
            variant="soft"
          >
            {updateMeta.isPending ? 'Saving…' : 'Save metadata'}
          </Button>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="3">
          <Text size="4" weight="bold">Organization</Text>

          <div>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Tags (comma-separated)</Text>
            <TextField.Root
              value={tags}
              onChange={(e) => { setTags(e.target.value); setDirty(true); }}
              placeholder="war, journalism, analysis"
            />
          </div>

          <div>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Series name</Text>
            <TextField.Root
              value={seriesName}
              onChange={(e) => { setSeriesName(e.target.value); setDirty(true); }}
              placeholder="My Book Series"
            />
          </div>

          <div>
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Part number</Text>
            <TextField.Root
              type="number"
              value={seriesPart}
              onChange={(e) => { setSeriesPart(e.target.value); setDirty(true); }}
              placeholder="1"
            />
          </div>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="3">
          <Text size="4" weight="bold">Publishing</Text>

          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Word count: {writing.wordCount.toLocaleString()}
          </Text>

          <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
            Last updated: {new Date(writing.updatedAt).toLocaleString()}
          </Text>

          {writing.publishedAt && (
            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
              Published: {new Date(writing.publishedAt).toLocaleString()}
            </Text>
          )}

          {status !== 'published' && (
            <Button
              onClick={handlePublish}
              disabled={publish.isPending}
            >
              {publish.isPending ? 'Publishing…' : 'Publish Now'}
            </Button>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
