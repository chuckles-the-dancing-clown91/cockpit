import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:opacity-60 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        solid: 'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-strong)]',
        outline: 'border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]',
        ghost: 'text-[var(--color-text-primary)] hover:bg-[var(--color-accent-soft)]',
        subtle: 'bg-[var(--color-surface-soft)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)]',
        danger: 'bg-[var(--color-danger)] text-white hover:brightness-110',
      },
      size: {
        sm: 'text-sm px-3 py-1.5',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-5 py-3',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'solid',
      size: 'md',
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);

Button.displayName = 'Button';
