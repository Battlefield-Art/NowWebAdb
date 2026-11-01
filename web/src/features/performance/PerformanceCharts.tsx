import { ArrowDownUp, BatteryMedium, Cpu, Gauge, MemoryStick, Thermometer } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { ChartSeries } from './MetricChart';
import { MetricCard } from './MetricCard';
import type { PerformanceSample } from './performanceSampler';

const WINDOW = 60;
const ACCENT = 'var(--color-accent)';
const SUCCESS = 'var(--color-success)';
const INFO = 'var(--color-info)';
const WARNING = 'var(--color-warning)';

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function megabytes(value: number): string {
  return `${value.toFixed(1)} MB`;
}

function frames(value: number): string {
  return `${value.toFixed(0)} FPS`;
}

function rate(value: number): string {
  return value >= 1024 ? `${(value / 1024).toFixed(2)} MB/s` : `${value.toFixed(1)} KB/s`;
}

function temperature(value: number): string {
  return `${value.toFixed(1)}°C`;
}

function column(samples: readonly PerformanceSample[], key: keyof PerformanceSample): ReadonlyArray<number | null> {
  return samples.map(sample => {
    const value = sample[key];
    return typeof value === 'number' ? value : null;
  });
}

export function PerformanceCharts({ samples }: { samples: readonly PerformanceSample[] }) {
  const t = useT();
  const recent = samples.slice(-WINDOW);
  const single = (key: keyof PerformanceSample, label: string, color: string): ChartSeries[] => [
    { label, color, values: column(recent, key) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        kicker="Processor"
        title={t('performance.chart.cpuTitle')}
        icon={Cpu}
        hint={t('performance.chart.cpuHint')}
        format={percent}
        fixedMax={100}
        series={[
          { label: t('performance.chart.series.app'), color: ACCENT, values: column(recent, 'cpuApp') },
          { label: t('performance.chart.series.system'), color: INFO, values: column(recent, 'cpuSystem') },
        ]}
      />
      <MetricCard
        kicker="Memory"
        title={t('performance.chart.memoryTitle')}
        icon={MemoryStick}
        hint={t('performance.chart.memoryHint')}
        format={megabytes}
        series={single('memoryMB', t('performance.chart.series.pss'), SUCCESS)}
      />
      <MetricCard
        kicker="Rendering"
        title={t('performance.chart.fpsTitle')}
        icon={Gauge}
        hint={t('performance.chart.fpsHint')}
        format={frames}
        series={single('fps', t('performance.chart.series.fps'), ACCENT)}
      />
      <MetricCard
        kicker="Network"
        title={t('performance.chart.networkTitle')}
        icon={ArrowDownUp}
        hint={t('performance.chart.networkHint')}
        format={rate}
        series={[
          { label: t('performance.chart.series.down'), color: SUCCESS, values: column(recent, 'rxKbps') },
          { label: t('performance.chart.series.up'), color: INFO, values: column(recent, 'txKbps') },
        ]}
      />
      <MetricCard
        kicker="Power"
        title={t('performance.chart.batteryTitle')}
        icon={BatteryMedium}
        hint={t('performance.chart.batteryHint')}
        format={percent}
        fixedMax={100}
        series={single('batteryLevel', t('performance.chart.series.level'), SUCCESS)}
      />
      <MetricCard
        kicker="Thermal"
        title={t('performance.chart.temperatureTitle')}
        icon={Thermometer}
        hint={t('performance.chart.temperatureHint')}
        format={temperature}
        fixedMin={15}
        series={single('batteryTemp', t('performance.chart.series.temperature'), WARNING)}
      />
    </div>
  );
}
