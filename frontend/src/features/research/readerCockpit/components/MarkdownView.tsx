import { Box } from '@radix-ui/themes';

interface MarkdownViewProps {
  content: string | null | undefined;
}

const cleanHtml = (html: string) => {
  return html
    .replace(/<img[^>]*>/g, '') // Remove images
    .replace(/<p>&nbsp;<\/p>/g, '') // Remove empty p tags
    .replace(/(\s*<br>\s*){3,}/g, '<br><br>') // Collapse multiple br tags
    .replace(/(\s*<p[^>]*>\s*<\/p>\s*){3,}/g, '<p></p><p></p>'); // Collapse multiple p tags
};

export const MarkdownView = ({ content }: MarkdownViewProps) => {
  if (!content) {
    return null;
  }

  const cleanedContent = cleanHtml(content);

  return (
    <Box p="4" dangerouslySetInnerHTML={{ __html: cleanedContent }} />
  );
};
