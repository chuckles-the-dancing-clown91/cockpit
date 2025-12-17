import { forwardRef } from 'react';
import { cn } from '@/core/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
