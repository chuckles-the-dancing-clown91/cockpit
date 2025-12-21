import * as React from 'react';

import { Badge, Flex, IconButton, TextField } from '@radix-ui/themes';
import { X } from 'lucide-react';

export interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  normalize?: (raw: string) => string;
}

export function TagsInput({
  value,
  onChange,
  placeholder = 'Type and press Enter…',
  maxTags,
  normalize,
}: TagsInputProps) {
  const [draft, setDraft] = React.useState('');

  const addTag = React.useCallback(
    (raw: string) => {
      const cleaned = (normalize ? normalize(raw) : raw).trim();
      if (!cleaned) return;
      if (value.includes(cleaned)) return;
      if (typeof maxTags === 'number' && value.length >= maxTags) return;
      onChange([...value, cleaned]);
    },
    [maxTags, normalize, onChange, value],
  );

  return (
    <Flex direction="column" gap="2">
      <Flex wrap="wrap" gap="2">
        {value.map((tag) => (
          <Badge key={tag} size="2" variant="soft">
            <Flex align="center" gap="2">
              {tag}
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                aria-label={`Remove ${tag}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(value.filter((t) => t !== tag));
                }}
              >
                <X size={12} />
              </IconButton>
            </Flex>
          </Badge>
        ))}
      </Flex>

      <TextField.Root
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag(draft);
            setDraft('');
          }
          if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
      />
    </Flex>
  );
}
