import type { LucideIcon } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { ChartSeries } from './MetricChart';
import { MetricChart } from './MetricChart';

export interface MetricCardProps {
  kicker: string;
  title: string;
  icon: LucideIcon;
  hint: string;
  series: readonly ChartSeries[];
  format: (value: number) => string;
  fixedMin?: number;
  fixedMax?: number;
}

function stats(values: ReadonlyArray<number | null>): { min: number; max: number; avg: number } | null {
  const numbers = values.filter((value): value is number => value !== null);
  if (!numbers.length) return null;
  const sum = numbers.reduce((total, value) => total + value, 0);
  return { min: Math.min(...numbers), max: Math.max(...numbers), avg: sum / numbers.length };
}

function lastValue(values: ReadonlyArray<number | null>): number | null {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

export function MetricCard({ kicker, title, icon: Icon, hint, series, format, fixedMin, fixedMax }: MetricCardProps) {
  const t = useT();
  const summary = stats(series[0]?.values ?? []);
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-[8px] border border-line-soft bg-surface-2 text-muted">
            <Icon className="size-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">{kicker}</p>
            <h2 className="truncate text-[12.5px] font-bold text-ink">{title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {series.map(item => {
            const value = lastValue(item.values);
            return (
              <span key={item.label} className="flex items-center gap-1 text-[10.5px] text-muted">
                <span className="size-1.5 rounded-full" style={{ background: item.color }} />
                <span className="mono font-semibold text-ink-soft">
                  {value === null ? '—' : format(value)}
                </span>
              </span>
            );
          })}
        </div>
      </header>

      <MetricChart series={series} min={fixedMin} max={fixedMax} className="h-[86px]" />

      <footer className="flex items-center justify-between gap-2 border-t border-line-soft pt-2 text-[10.5px] text-muted-2">
        {summary ? (
          <span className="mono">
            {t('performance.card.stats', {
              min: format(summary.min),
              avg: format(summary.avg),
              max: format(summary.max),
            })}
          </span>
        ) : (
          <span>{hint}</span>
        )}
        <span className="shrink-0">
          {t('performance.card.window', { count: series[0]?.values.length ?? 0 })}
        </span>
      </footer>
    </section>
  );
}
