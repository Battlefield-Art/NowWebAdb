import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function Input({ className, leading, trailing, ...props }: InputProps) {
  return (
    <div
      className={cn(
        'group flex h-8 items-center gap-2 rounded-control border border-line-strong bg-surface px-2.5',
        'transition-[border-color,box-shadow] duration-150 hover:border-ink-soft',
        'focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(228,87,46,0.12)]',
        className,
      )}
    >
      {leading ? <span className="shrink-0 text-muted-2 [&_svg]:size-3.5">{leading}</span> : null}
      <input
        className="h-full w-full min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted-2"
        {...props}
      />
      {trailing ? <span className="shrink-0 text-muted-2">{trailing}</span> : null}
    </div>
  );
}
