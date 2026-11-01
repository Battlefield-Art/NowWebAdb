import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ToolbarButtonProps extends ComponentPropsWithRef<'button'> {
  active?: boolean;
}

export function ToolbarButton({ active, className, type = 'button', ...props }: ToolbarButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-[7px] text-muted transition-colors',
        'hover:bg-surface-3 hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent-ink',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
