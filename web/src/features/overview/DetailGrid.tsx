import type { DeviceSnapshot } from '@/lib/adb/deviceInfo';
import { useT } from '@/lib/i18n';
import { formatUptime } from '@/lib/utils/format';

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2 last:border-0">
      <dt className="shrink-0 text-[11.5px] text-muted">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[12px] text-ink-soft ${mono ? 'font-mono text-[11px]' : ''}`} title={value}>
        {value || '—'}
      </dd>
    </div>
  );
}

export function DetailGrid({ snapshot }: { snapshot: DeviceSnapshot }) {
  const t = useT();
  const { cpu, memory, storage, network, battery } = snapshot;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-[12px] border border-line bg-surface p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{t('overview.detail.system')}</h3>
        <dl className="mt-2">
          <Row
            label={t('overview.detail.androidVersion')}
            value={t('overview.detail.androidVersionValue', {
              version: snapshot.androidVersion || '—',
              sdk: snapshot.sdk || '—',
            })}
          />
          <Row label={t('overview.detail.buildId')} value={snapshot.buildId} mono />
          <Row label={t('overview.detail.display')} value={snapshot.display} mono />
          <Row label={t('overview.detail.buildType')} value={snapshot.buildType} />
          <Row label={t('overview.detail.tags')} value={snapshot.tags} />
          <Row label={t('overview.detail.kernel')} value={snapshot.kernelVersion} mono />
          <Row label={t('overview.detail.bootloader')} value={snapshot.bootloader} />
          <Row label={t('overview.detail.fingerprint')} value={snapshot.fingerprint} mono />
        </dl>
      </section>

      <section className="rounded-[12px] border border-line bg-surface p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{t('overview.detail.hardware')}</h3>
        <dl className="mt-2">
          <Row label={t('overview.detail.serial')} value={snapshot.serial} mono />
          <Row label={t('overview.detail.model')} value={`${snapshot.device || '—'} / ${snapshot.board || '—'}`} mono />
          <Row
            label={t('overview.detail.cpu')}
            value={t('overview.detail.cpuValue', { abi: cpu.abi || '—', cores: cpu.cores || '—' })}
          />
          <Row
            label={t('overview.detail.cpuFrequency')}
            value={cpu.maxMHz ? `${cpu.currentMHz} / ${cpu.minMHz}–${cpu.maxMHz} MHz` : '—'}
            mono
          />
          <Row label={t('overview.detail.screen')} value={`${snapshot.resolution || '—'} · ${snapshot.density || '—'} dpi`} />
          <Row
            label={t('overview.detail.memory')}
            value={t('overview.detail.memoryValue', { used: memory.usedMB, total: memory.totalMB })}
            mono
          />
          <Row
            label={t('overview.detail.storage')}
            value={t('overview.detail.storageValue', { used: storage.usedLabel, total: storage.totalLabel })}
            mono
          />
          <Row label={t('overview.detail.wifi')} value={network.wifi || t('overview.detail.notConnected')} />
          <Row label={t('overview.detail.ip')} value={network.ip} mono />
          <Row
            label={t('overview.detail.battery')}
            value={t(
              battery.charging
                ? 'overview.detail.batteryValueCharging'
                : 'overview.detail.batteryValue',
              { level: battery.level, temperature: battery.temperature.toFixed(1) },
            )}
          />
          <Row label={t('overview.detail.uptime')} value={formatUptime(snapshot.uptimeSeconds)} />
        </dl>
      </section>
    </div>
  );
}
