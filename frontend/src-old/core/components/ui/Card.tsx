import * as React from 'react';
import { cn } from '@/core/lib/cn';

const CardRoot = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'group/card relative flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)]',
        'bg-[var(--color-card-bg)] shadow-[var(--shadow-card-elevated)] transition-all duration-200',
        'hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--color-border-accent)] hover:translate-y-[-1px] hover:scale-[1.005]',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-card)+2px)] before:border before:border-[var(--color-border-accent-soft)] before:opacity-0 before:transition-opacity before:duration-200 group-hover/card:before:opacity-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
CardRoot.displayName = 'Card';

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'px-3 pt-3 pb-1 flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)]',
      className
    )}
    {...props}
  />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-sm font-semibold tracking-tight text-[var(--color-text-primary)]', className)} {...props} />
);

const CardSubtitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('text-[0.7rem] uppercase tracking-[0.14em] text-[var(--color-text-soft)]', className)} {...props} />
);

const CardBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-3 py-2 flex-1 min-h-0 text-sm text-[var(--color-text-muted)]', className)} {...props} />
);

const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('px-3 pb-3 pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2', className)}
    {...props}
  />
);

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Subtitle: CardSubtitle,
  Body: CardBody,
  Footer: CardFooter,
});
