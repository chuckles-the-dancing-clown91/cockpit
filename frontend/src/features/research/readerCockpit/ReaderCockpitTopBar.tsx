import { Badge, Button, Flex, Text, TextField } from '@radix-ui/themes';
import { ArrowLeft, ArrowRight, ExternalLink, RefreshCcw, Scissors, Link as LinkIcon } from 'lucide-react';

type ReaderCockpitTopBarProps = {
  urlInput: string;
  onUrlChange: (value: string) => void;
  onSubmitUrl: () => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onOpenLivePage: () => void;
  onCaptureSelection: () => void;
  onCopyCitation: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  contextLabel?: string;
};

export function ReaderCockpitTopBar({
  urlInput,
  onUrlChange,
  onSubmitUrl,
  onBack,
  onForward,
  onRefresh,
  onOpenLivePage,
  onCaptureSelection,
  onCopyCitation,
  canGoBack,
  canGoForward,
  isLoading,
  contextLabel,
}: ReaderCockpitTopBarProps) {
  return (
    <Flex direction="column" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <Flex align="center" justify="between" gap="3" style={{ padding: 'var(--space-3)' }}>
        <Flex align="center" gap="2">
          <Button variant="ghost" size="2" onClick={onBack} disabled={!canGoBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <Button variant="ghost" size="2" onClick={onForward} disabled={!canGoForward}>
            <ArrowRight size={16} />
            Forward
          </Button>
          <Button variant="soft" size="2" onClick={onRefresh} disabled={isLoading}>
            <RefreshCcw size={16} />
            Refresh
          </Button>
        </Flex>

        <Flex align="center" gap="2">
          <Button variant="soft" size="2" onClick={onOpenLivePage}>
            <ExternalLink size={16} />
            Open Live Page
          </Button>
          <Button variant="soft" size="2" onClick={onCaptureSelection} disabled={isLoading}>
            <Scissors size={16} />
            Capture Selection
          </Button>
          <Button variant="soft" size="2" onClick={onCopyCitation} disabled={isLoading}>
            <LinkIcon size={16} />
            Copy Citation
          </Button>
          {contextLabel && (
            <Badge color="blue">{contextLabel}</Badge>
          )}
        </Flex>
      </Flex>

      <Flex align="center" gap="2" style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
        <TextField.Root
          value={urlInput}
          onChange={(event) => onUrlChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onSubmitUrl()}
          placeholder="Paste a URL and press Enter..."
          style={{ flex: 1 }}
        />
        <Button onClick={onSubmitUrl} disabled={!urlInput.trim()}>
          Go
        </Button>
        {isLoading && (
          <Text size="2" color="gray">
            Loading...
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
