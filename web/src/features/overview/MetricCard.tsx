import type { LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils/cn';

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  percent?: number;
  accent?: 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

const TONES = {
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function MetricCard({ icon: Icon, label, value, hint, percent, accent = 'accent', className }: MetricCardProps) {
  return (
    <div className={cn('rounded-[12px] border border-line bg-surface p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
        <Icon className={cn('size-3.5', TONES[accent])} strokeWidth={2.2} />
      </div>
      <p className="mt-2 font-mono text-[20px] font-semibold leading-none tracking-[-0.02em] text-ink">{value}</p>
      {hint ? <p className="mt-1.5 truncate text-[11px] text-muted">{hint}</p> : null}
      {percent !== undefined ? <Progress value={Math.min(100, Math.max(0, percent))} className="mt-3 h-1 rounded-full" /> : null}
    </div>
  );
}
