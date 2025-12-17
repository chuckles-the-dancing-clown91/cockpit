import { Flex, Heading, Text } from '@radix-ui/themes';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="4"
      style={{ minHeight: '60vh' }}
    >
      <Heading size="8">{title}</Heading>
      {description && (
        <Text size="4" color="gray">
          {description}
        </Text>
      )}
      <Text size="2" color="gray">
        Coming soon...
      </Text>
    </Flex>
  );
}
