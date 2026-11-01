import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        'animate-pulse rounded-md bg-[linear-gradient(100deg,var(--color-surface-3)_30%,var(--color-surface-2)_50%,var(--color-surface-3)_70%)] bg-[length:220%_100%]',
        className,
      )}
    />
  );
}
