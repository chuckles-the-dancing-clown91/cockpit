import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[color:var(--color-overlay-scrim)] backdrop-blur-[2px]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(420px,100%-2rem)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] shadow-[var(--shadow-card-elevated)] p-6">
          <AlertDialog.Title className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-[var(--color-text-soft)] mb-6">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" size="sm">
                {cancelText}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={variant === 'danger' ? 'solid' : 'solid'}
                size="sm"
                onClick={onConfirm}
                className={
                  variant === 'danger'
                    ? 'bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90'
                    : ''
                }
              >
                {confirmText}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
