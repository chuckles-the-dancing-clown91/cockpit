import { useState, useCallback } from 'react';

export type ToastProps = {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type Toast = ToastProps & {
  id: string;
};

let toastQueue: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

function notify() {
  listeners.forEach((listener) => listener(toastQueue));
}

export function toast({ title, description, variant = 'default' }: ToastProps) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: Toast = { id, title, description, variant };
  
  toastQueue = [...toastQueue, newToast];
  notify();

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id);
    notify();
  }, 5000);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastQueue);

  useCallback(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toast, toasts };
}
