import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-[11.5px] font-semibold text-ink-soft">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[11px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[11px] leading-relaxed text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
