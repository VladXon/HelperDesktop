import * as React from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-all focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),0_0_8px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
