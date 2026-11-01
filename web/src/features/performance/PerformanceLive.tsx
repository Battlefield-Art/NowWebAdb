import { Activity } from 'lucide-react';
import type { ForegroundApp } from '@/lib/adb/activity';
import { useT } from '@/lib/i18n';
import type { PerformanceSample } from './performanceSampler';

export interface PerformanceLiveProps {
  latest: PerformanceSample | null;
  foreground: ForegroundApp | null;
  activeName: string;
  count: number;
  maxPoints: number;
}

function value(input: number | null | undefined, suffix: string, digits = 1): string {
  return input === null || input === undefined ? '—' : `${input.toFixed(digits)}${suffix}`;
}

export function PerformanceLive({ latest, foreground, activeName, count, maxPoints }: PerformanceLiveProps) {
  const t = useT();
  const metrics = [
    { key: 'app', label: t('performance.live.cpuApp'), value: value(latest?.cpuApp, '%') },
    { key: 'system', label: t('performance.live.cpuSystem'), value: value(latest?.cpuSystem, '%') },
    { key: 'memory', label: t('performance.live.memory'), value: value(latest?.memoryMB, ' MB') },
    { key: 'fps', label: t('performance.live.fps'), value: value(latest?.fps, ' FPS', 0) },
    { key: 'battery', label: t('performance.live.batteryTemp'), value: value(latest?.batteryTemp, '°C') },
  ];
  return (
    <section className="grid gap-3 rounded-card border border-line bg-surface p-4 shadow-card lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {metrics.map(metric => (
            <div key={metric.key} className="rounded-tile border border-line-soft bg-surface-2 px-2.5 py-2">
              <p className="text-[10.5px] text-muted">{metric.label}</p>
              <p className="mono mt-0.5 truncate text-[15px] font-semibold text-ink">{metric.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <Activity className="size-3" />
          {t('performance.live.captured', { count })}
          {maxPoints > 0
            ? t('performance.live.capped', { max: maxPoints })
            : t('performance.live.unlimited')}
        </p>
      </div>

      <aside className="rounded-tile border border-line-soft bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">Foreground</p>
          <span className="text-[10.5px] text-muted">{foreground ? foreground.source : '—'}</span>
        </div>
        <p className="mono mt-2 truncate text-[12px] font-semibold text-ink-soft">
          {foreground?.packageName ?? activeName}
        </p>
        <p className="mono mt-1 truncate text-[10.5px] text-muted">
          {foreground ? foreground.activityName.split('/').pop() : t('performance.live.noForegroundActivity')}
        </p>
      </aside>
    </section>
  );
}
