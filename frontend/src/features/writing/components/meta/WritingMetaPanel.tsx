/**
 * WritingMetaPanel - Right sidebar for writing metadata
 */

import { Card, Flex, Text, TextField, Select, Button, Badge } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { useEffect, useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { Writing, WritingType, WritingStatus } from '../../types';
import { useUpdateWritingMeta, usePublishWriting } from '../../hooks/useWriting';

interface WritingMetaPanelProps {
  writing: Writing;
  liveWordCount?: number;
}

export function WritingMetaPanel({ writing, liveWordCount }: WritingMetaPanelProps) {
  const updateMeta = useUpdateWritingMeta(writing.id);
  const publish = usePublishWriting(writing.id);

  const [title, setTitle] = useState(writing.title);
  const [slug, setSlug] = useState(writing.slug || '');
  const [excerpt, setExcerpt] = useState(writing.excerpt || '');
  const [writingType, setWritingType] = useState<WritingType>(writing.writingType);
  const [status, setStatus] = useState<WritingStatus>(writing.status);
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState<string[]>([]);
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
    const parsedTags = writing.tags ? writing.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    setTagList(parsedTags);
    setTagInput('');
    setSeriesName(writing.seriesName || '');
    setSeriesPart(writing.seriesPart?.toString() || '');
    setDirty(false);
  }, [writing.id, writing.updatedAt]);

  const handleAddTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tagList.includes(newTag)) {
        setTagList([...tagList, newTag]);
        setTagInput('');
        setDirty(true);
      } else if (e.key === ',') {
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagList(tagList.filter(tag => tag !== tagToRemove));
    setDirty(true);
  };

  const handleSave = () => {
    updateMeta.mutate({
      title,
      slug: slug || null,
      excerpt: excerpt || null,
      writingType,
      status,
      tags: tagList.length > 0 ? tagList.join(', ') : null,
      seriesName: seriesName || null,
      seriesPart: seriesPart ? parseInt(seriesPart, 10) : null,
    });
    setDirty(false);
  };

  const handlePublish = () => {
    publish.mutate();
  };

  return (
    <Form.Root onSubmit={(e) => { e.preventDefault(); if (dirty) handleSave(); }}>
      <Flex direction="column" gap="3" style={{ padding: '12px' }}>
        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold">Metadata</Text>

            <Form.Field name="title">
              <Form.Label asChild>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Title</Text>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                  placeholder="Title…"
                  required
                />
              </Form.Control>
            </Form.Field>

            <Form.Field name="slug">
              <Form.Label asChild>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Slug (URL)</Text>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setDirty(true); }}
                  placeholder="my-article-slug"
                />
              </Form.Control>
            </Form.Field>

            <Form.Field name="excerpt">
              <Form.Label asChild>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Excerpt</Text>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={excerpt}
                  onChange={(e) => { setExcerpt(e.target.value); setDirty(true); }}
                  placeholder="Short description…"
                />
              </Form.Control>
            </Form.Field>

            <Flex gap="2">
              <Form.Field name="type" style={{ flex: 1 }}>
                <Form.Label asChild>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Type</Text>
                </Form.Label>
                <Form.Control asChild>
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
                </Form.Control>
              </Form.Field>

              <Form.Field name="status" style={{ flex: 1 }}>
                <Form.Label asChild>
                  <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Status</Text>
                </Form.Label>
                <Form.Control asChild>
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
                </Form.Control>
              </Form.Field>
            </Flex>

            <Form.Submit asChild>
              <Button
                disabled={!dirty || updateMeta.isPending}
                variant="soft"
              >
                {updateMeta.isPending ? 'Saving…' : 'Save metadata'}
              </Button>
            </Form.Submit>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold">Organization</Text>

            <Form.Field name="tags">
              <Form.Label asChild>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Tags</Text>
              </Form.Label>
              
              {/* Display tag pills */}
              {tagList.length > 0 && (
                <Flex gap="2" wrap="wrap" mb="2">
                  {tagList.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="soft"
                      style={{ cursor: 'pointer' }}
                    >
                      {tag}
                      <X 
                        size={12} 
                        style={{ marginLeft: '4px' }} 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </Flex>
              )}
              
              <Form.Control asChild>
                <TextField.Root
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type tag and press Enter or comma"
                />
              </Form.Control>
              <Form.Message asChild match={() => false}>
                <Text size="1" color="gray">Press Enter or comma to add a tag</Text>
              </Form.Message>
            </Form.Field>

            <Form.Field name="seriesName">
              <Form.Label asChild>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Series name</Text>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  value={seriesName}
                  onChange={(e) => { setSeriesName(e.target.value); setDirty(true); }}
                  placeholder="My Book Series"
                />
              </Form.Control>
            </Form.Field>

            <Form.Field name="seriesPart">
              <Form.Label asChild>
                <Text size="2" style={{ color: 'var(--color-text-soft)' }}>Part number</Text>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  type="number"
                  value={seriesPart}
                  onChange={(e) => { setSeriesPart(e.target.value); setDirty(true); }}
                  placeholder="1"
                />
              </Form.Control>
            </Form.Field>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3">
            <Text size="4" weight="bold">Publishing</Text>

            <Text size="2" style={{ color: 'var(--color-text-soft)' }}>
              Word count: {(liveWordCount ?? writing.wordCount).toLocaleString()}
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
    </Form.Root>
  );
}
