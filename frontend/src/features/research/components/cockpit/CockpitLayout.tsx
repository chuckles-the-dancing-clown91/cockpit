import { ReactNode } from 'react';
import { Box, Button, Flex, Heading, TextField } from '@radix-ui/themes';
import { ArrowLeft } from 'lucide-react';

type CockpitLayoutProps = {
  title: string;
  urlInput: string;
  onUrlChange: (next: string) => void;
  onSubmitUrl: () => void;
  onBack: () => void;
  left: ReactNode;
  right: ReactNode;
};

export function CockpitLayout({
  title,
  urlInput,
  onUrlChange,
  onSubmitUrl,
  onBack,
  left,
  right,
}: CockpitLayoutProps) {
  return (
    <Flex
      direction="column"
      style={{
        width: '100vw',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <Box>
        <Flex
          direction="row"
          align="center"
          justify="between"
          gap="3"
          style={{
            padding: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <Heading
            size="4"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}
          >
            {title}
          </Heading>
        </Flex>
        <Flex
          gap="2"
          align="center"
          style={{
            padding: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <TextField.Root
            value={urlInput}
            onChange={(event) => onUrlChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSubmitUrl()}
            placeholder="Enter a URL and press Enter..."
            style={{ flex: 1 }}
          />
          <Button onClick={onSubmitUrl}>Go</Button>
        </Flex>
      </Box>
      <Flex
        direction="row"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {left}
        {right}
      </Flex>
    </Flex>
  );
}
