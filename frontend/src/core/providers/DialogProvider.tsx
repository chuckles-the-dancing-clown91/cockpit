import { createContext, useContext, useState, ReactNode } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { Button, Flex, TextField } from '@radix-ui/themes';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}

interface DialogState {
  type: 'confirm' | 'prompt' | null;
  options: ConfirmOptions | PromptOptions | null;
  resolve: ((value: boolean | string | null) => void) | null;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    type: null,
    options: null,
    resolve: null,
  });
  const [promptValue, setPromptValue] = useState('');

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        type: 'confirm',
        options,
        resolve: resolve as (value: boolean) => void,
      });
    });
  };

  const prompt = (options: PromptOptions): Promise<string | null> => {
    setPromptValue(options.defaultValue || '');
    return new Promise((resolve) => {
      setState({
        type: 'prompt',
        options,
        resolve: resolve as (value: string | null) => void,
      });
    });
  };

  const handleClose = (result: boolean | string | null) => {
    if (state.resolve) {
      state.resolve(result);
    }
    setState({ type: null, options: null, resolve: null });
    setPromptValue('');
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* Confirm Dialog */}
      {state.type === 'confirm' && state.options && (
        <AlertDialog.Root open={true} onOpenChange={(open) => !open && handleClose(false)}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 50,
              }}
            />
            <AlertDialog.Content
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(500px, 90vw)',
                maxHeight: '85vh',
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--radius-3)',
                border: '1px solid var(--gray-a6)',
                boxShadow: 'var(--shadow-6)',
                padding: '1.5rem',
                zIndex: 51,
              }}
            >
              <Flex direction="column" gap="4">
                <Flex align="center" gap="3">
                  {(state.options as ConfirmOptions).variant === 'danger' && (
                    <AlertTriangle size={24} color="var(--red-9)" />
                  )}
                  <AlertDialog.Title
                    style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: 'var(--gray-12)',
                    }}
                  >
                    {state.options.title}
                  </AlertDialog.Title>
                </Flex>

                {state.options.description && (
                  <AlertDialog.Description
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: 'var(--gray-11)',
                      lineHeight: 1.5,
                    }}
                  >
                    {state.options.description}
                  </AlertDialog.Description>
                )}

                <Flex gap="3" justify="end" mt="2">
                  <AlertDialog.Cancel asChild>
                    <Button variant="soft" color="gray" onClick={() => handleClose(false)}>
                      {(state.options as ConfirmOptions).cancelText || 'Cancel'}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button
                      color={(state.options as ConfirmOptions).variant === 'danger' ? 'red' : 'blue'}
                      onClick={() => handleClose(true)}
                    >
                      {(state.options as ConfirmOptions).confirmText || 'Confirm'}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      )}

      {/* Prompt Dialog */}
      {state.type === 'prompt' && state.options && (
        <Dialog.Root open={true} onOpenChange={(open) => !open && handleClose(null)}>
          <Dialog.Portal>
            <Dialog.Overlay
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 50,
              }}
            />
            <Dialog.Content
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(500px, 90vw)',
                maxHeight: '85vh',
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--radius-3)',
                border: '1px solid var(--gray-a6)',
                boxShadow: 'var(--shadow-6)',
                padding: '1.5rem',
                zIndex: 51,
              }}
            >
              <Flex direction="column" gap="4">
                <Flex align="center" justify="between">
                  <Dialog.Title
                    style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: 'var(--gray-12)',
                    }}
                  >
                    {state.options.title}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-2)',
                        color: 'var(--gray-11)',
                      }}
                      onClick={() => handleClose(null)}
                    >
                      <X size={18} />
                    </button>
                  </Dialog.Close>
                </Flex>

                {state.options.description && (
                  <Dialog.Description
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: 'var(--gray-11)',
                      lineHeight: 1.5,
                    }}
                  >
                    {state.options.description}
                  </Dialog.Description>
                )}

                <TextField.Root
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={(state.options as PromptOptions).placeholder}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleClose(promptValue);
                    } else if (e.key === 'Escape') {
                      handleClose(null);
                    }
                  }}
                />

                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close asChild>
                    <Button variant="soft" color="gray" onClick={() => handleClose(null)}>
                      {(state.options as PromptOptions).cancelText || 'Cancel'}
                    </Button>
                  </Dialog.Close>
                  <Button color="blue" onClick={() => handleClose(promptValue)}>
                    {(state.options as PromptOptions).confirmText || 'OK'}
                  </Button>
                </Flex>
              </Flex>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </DialogContext.Provider>
  );
}
