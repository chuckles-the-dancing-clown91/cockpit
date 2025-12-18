import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import type { ToasterToast, ToastVariant } from '@/core/lib/toast';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    style={{
      position: 'fixed',
      top: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      maxHeight: '100vh',
      width: '100%',
      flexDirection: 'column',
      padding: '1rem',
      gap: '0.5rem',
    }}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    variant?: ToastVariant;
  }
>(({ variant = 'default', ...props }, ref) => {
  const variantStyles = {
    default: {
      backgroundColor: 'var(--color-surface)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-primary)',
    },
    success: {
      backgroundColor: '#10b981',
      borderColor: '#059669',
      color: 'white',
    },
    error: {
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      color: 'white',
    },
  };

  return (
    <ToastPrimitives.Root
      ref={ref}
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        display: 'flex',
        width: '100%',
        maxWidth: '420px',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        overflow: 'hidden',
        borderRadius: 'var(--radius-3)',
        border: '1px solid',
        padding: '1rem',
        paddingRight: '2rem',
        boxShadow: 'var(--shadow-5)',
        marginLeft: 'auto',
        ...variantStyles[variant],
      }}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    style={{
      position: 'absolute',
      right: '0.5rem',
      top: '0.5rem',
      borderRadius: 'var(--radius-2)',
      padding: '0.25rem',
      opacity: 0.7,
      transition: 'opacity 0.15s',
      cursor: 'pointer',
      border: 'none',
      background: 'transparent',
      color: 'inherit',
    }}
    {...props}
  >
    <X size={16} />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    style={{
      fontSize: '0.875rem',
      fontWeight: 600,
    }}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    style={{
      fontSize: '0.875rem',
      opacity: 0.9,
      marginTop: '0.25rem',
    }}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose };
export type { ToasterToast };
