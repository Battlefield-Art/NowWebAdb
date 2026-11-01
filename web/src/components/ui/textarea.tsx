import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full resize-y rounded-control border border-line-strong bg-surface px-2.5 py-2',
        'text-[12.5px] leading-relaxed text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted-2',
        'hover:border-ink-soft focus:border-accent focus:shadow-[0_0_0_3px_rgba(228,87,46,0.12)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
