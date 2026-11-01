import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function AssistantPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn('overflow-hidden rounded-[14px] border border-line bg-surface shadow-card', className)}
    >
      {children}
    </section>
  );
}

export interface PanelHeaderProps {
  step: string;
  kicker: string;
  title: string;
  extra?: ReactNode;
  className?: string;
}

export function PanelHeader({ step, kicker, title, extra, className }: PanelHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center gap-3 border-b border-line-soft bg-surface-2/60 px-4 py-3',
        className,
      )}
    >
      <span className="mono grid size-7 shrink-0 place-items-center rounded-[7px] border border-line-strong bg-surface text-[10.5px] font-semibold text-muted">
        {step}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">{kicker}</p>
        <h2 className="text-[13.5px] font-bold text-ink">{title}</h2>
      </div>
      {extra ? <div className="ml-auto shrink-0">{extra}</div> : null}
    </header>
  );
}
