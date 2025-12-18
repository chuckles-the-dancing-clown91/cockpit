import { useDialog } from '@/core/providers/DialogProvider';
import { toast } from '@/core/lib/toast';
import { Button, Flex } from '@radix-ui/themes';
import { Trash2, Link as LinkIcon } from 'lucide-react';

/**
 * Example component showing how to use the dialog system
 */
export function DialogExamples() {
  const { confirm, prompt } = useDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Item',
      description: 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      toast.success('Item deleted', 'The item has been successfully deleted.');
    }
  };

  const handleAddLink = async () => {
    const url = await prompt({
      title: 'Insert Link',
      description: 'Enter the URL for the link',
      placeholder: 'https://example.com',
      confirmText: 'Insert',
      cancelText: 'Cancel',
    });

    if (url) {
      toast.success('Link added', `URL: ${url}`);
      // In TipTap editor, you would use: editor.chain().focus().setLink({ href: url }).run()
    }
  };

  const handleSimpleConfirm = async () => {
    const confirmed = await confirm({
      title: 'Are you sure?',
      confirmText: 'Yes',
      cancelText: 'No',
    });

    toast.info('Result', confirmed ? 'Confirmed' : 'Cancelled');
  };

  return (
    <Flex direction="column" gap="4" p="6">
      <Button onClick={handleDelete} color="red" variant="soft">
        <Trash2 size={16} />
        Delete with Confirmation
      </Button>

      <Button onClick={handleAddLink} color="blue" variant="soft">
        <LinkIcon size={16} />
        Prompt for URL
      </Button>

      <Button onClick={handleSimpleConfirm} color="gray" variant="soft">
        Simple Confirm
      </Button>
    </Flex>
  );
}
