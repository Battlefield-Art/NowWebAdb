import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface PanelShellProps {
  kicker: string;
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function PanelShell({ kicker, title, action, className, children }: PanelShellProps) {
  return (
    <section className={cn('flex flex-col rounded-[14px] border border-line bg-surface p-5', className)}>
      <header className="flex items-start justify-between gap-3 border-b border-line-soft pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-2">{kicker}</p>
          <h2 className="mt-1 text-[14px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        </div>
        {action}
      </header>
      <div className="mt-4 flex min-w-0 flex-1 flex-col gap-3">{children}</div>
    </section>
  );
}
