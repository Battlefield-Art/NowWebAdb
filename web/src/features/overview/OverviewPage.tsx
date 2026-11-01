import { useEffect } from 'react';
import { BatteryCharging, Cpu, HardDrive, MemoryStick, RefreshCw, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { DetailGrid } from '@/features/overview/DetailGrid';
import { MetricCard } from '@/features/overview/MetricCard';
import { useT } from '@/lib/i18n';
import { formatClockTime } from '@/lib/utils/format';
import { useDeviceStore } from '@/stores/device';

function LoadingGrid() {
  return (
    <div className="grid gap-4">
      <div className="rounded-[14px] border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-[12px]" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-[10px]" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const t = useT();
  const snapshot = useDeviceStore(state => state.snapshot);
  const loading = useDeviceStore(state => state.snapshotLoading);
  const error = useDeviceStore(state => state.snapshotError);
  const refreshSnapshot = useDeviceStore(state => state.refreshSnapshot);

  useEffect(() => {
    if (!snapshot && !loading) void refreshSnapshot();
  }, [snapshot, loading, refreshSnapshot]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">Overview</p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('overview.title')}</h1>
          <p className="mt-1 text-[11.5px] text-muted">
            {snapshot
              ? t('overview.capturedAt', { time: formatClockTime(snapshot.capturedAt) })
              : t('overview.loading')}
          </p>
        </div>
        <Button variant="outline" size="md" onClick={() => void refreshSnapshot()} disabled={loading}>
          {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
          {t('common.refresh')}
        </Button>
      </div>

      {!snapshot && loading ? <LoadingGrid /> : null}

      {!snapshot && !loading ? (
        <div className="rounded-[14px] border border-line bg-surface">
          <EmptyState
            icon={<Smartphone />}
            title={error ? t('overview.error.title') : t('overview.empty.title')}
            description={error || t('overview.empty.description')}
            action={
              <Button variant="primary" size="md" onClick={() => void refreshSnapshot()}>
                {t('overview.empty.retry')}
              </Button>
            }
          />
        </div>
      ) : null}

      {snapshot ? (
        <>
          <section className="rounded-[14px] border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-[12px] bg-accent-soft text-accent">
                  <Smartphone className="size-5" />
                </span>
                <div>
                  <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
                    {snapshot.model || t('overview.device.defaultModel')}
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    {[snapshot.manufacturer, snapshot.brand].filter(Boolean).join(' · ') ||
                      t('overview.device.unknownVendor')}
                  </p>
                </div>
                <Badge tone="success">{t('overview.device.online')}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right sm:grid-cols-4">
                {[
                  [t('overview.field.android'), snapshot.androidVersion ? `${snapshot.androidVersion}` : '—'],
                  [t('overview.field.api'), snapshot.sdk || '—'],
                  [t('overview.field.resolution'), snapshot.resolution || '—'],
                  [t('overview.field.density'), snapshot.density ? `${snapshot.density} dpi` : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-2">{label}</p>
                    <p className="mt-0.5 font-mono text-[12.5px] font-semibold text-ink-soft">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              icon={BatteryCharging}
              label={t('overview.battery')}
              value={`${snapshot.battery.level}%`}
              hint={t('overview.battery.hint', {
                state: snapshot.battery.charging
                  ? t('overview.battery.charging')
                  : t('overview.battery.discharging'),
                temperature: snapshot.battery.temperature.toFixed(1),
                voltage: (snapshot.battery.voltage / 1000).toFixed(2),
              })}
              percent={snapshot.battery.level}
              accent={snapshot.battery.level <= 20 ? 'danger' : snapshot.battery.level <= 40 ? 'warning' : 'success'}
            />
            <MetricCard
              icon={MemoryStick}
              label={t('overview.memory')}
              value={`${snapshot.memory.usedMB}`}
              hint={t('overview.memory.hint', { total: snapshot.memory.totalMB })}
              percent={snapshot.memory.usedPercent}
              accent={snapshot.memory.usedPercent >= 90 ? 'danger' : 'accent'}
            />
            <MetricCard
              icon={HardDrive}
              label={t('overview.storage')}
              value={snapshot.storage.usedLabel}
              hint={t('overview.storage.hint', { total: snapshot.storage.totalLabel })}
              percent={snapshot.storage.usedPercent}
              accent={snapshot.storage.usedPercent >= 90 ? 'danger' : 'accent'}
            />
          </div>

          <DetailGrid snapshot={snapshot} />

          <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-[11px] text-muted">
            <Cpu className="size-3.5 text-muted-2" />
            {t('overview.cpu.line', {
              abi: snapshot.cpu.abi || '—',
              cores: snapshot.cpu.cores || '—',
              freq: snapshot.cpu.maxMHz
                ? `${snapshot.cpu.minMHz}–${snapshot.cpu.maxMHz} MHz`
                : t('overview.cpu.freqUnavailable'),
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
