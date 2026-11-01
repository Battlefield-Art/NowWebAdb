import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CapabilitiesPanel } from '@/features/connection/CapabilitiesPanel';
import { DemoModePanel } from '@/features/connection/DemoModePanel';
import { DeviceBackupPanel } from '@/features/connection/DeviceBackupPanel';
import { ForwardPanel } from '@/features/connection/ForwardPanel';
import { DiagnosticsPanel } from '@/features/connection/DiagnosticsPanel';
import { KeyPanel } from '@/features/connection/KeyPanel';
import { LinkPanel } from '@/features/connection/LinkPanel';
import { PowerPanel } from '@/features/connection/PowerPanel';
import { ReversePanel } from '@/features/connection/ReversePanel';
import { SystemSettingsPanel } from '@/features/connection/SystemSettingsPanel';
import { TcpIpPanel } from '@/features/connection/TcpIpPanel';
import { VirtualDisplayPanel } from '@/features/connection/VirtualDisplayPanel';
import { useConnectionStatus } from '@/features/connection/useConnectionStatus';
import { useT } from '@/lib/i18n';
import { selectAdb, useDeviceStore } from '@/stores/device';

export default function ConnectionPage() {
  const t = useT();
  const adb = useDeviceStore(selectAdb);
  const kind = useDeviceStore(state => state.kind);
  const serial = useDeviceStore(state => state.serial);
  const server = useDeviceStore(state => state.server);
  const { status, loading, refresh } = useConnectionStatus(adb, server, serial);

  if (!adb) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">Connection</p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('connection.page.title')}</h1>
          <p className="mt-1 text-[11.5px] text-muted">
            {kind === 'usb' ? t('connection.page.kindUsb') : t('connection.page.kindServer')} ·{' '}
            {serial || t('common.unknownDevice')} · {t('connection.page.subtitle')}
          </p>
        </div>
        <Button variant="outline" size="md" onClick={refresh} disabled={loading}>
          {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
          {t('connection.page.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <LinkPanel status={status} loading={loading} onRefresh={refresh} />
        <TcpIpPanel adb={adb} status={status} onChanged={refresh} />
        <KeyPanel />
        <ReversePanel
          adb={adb}
          tunnels={status.reverse}
          error={status.reverseError}
          canAddExternal={kind === 'server'}
          onChanged={refresh}
        />
        <ForwardPanel
          server={server}
          serial={serial}
          rules={status.forwards}
          error={status.forwardsError}
          onChanged={refresh}
        />
        <PowerPanel adb={adb} />
        <SystemSettingsPanel adb={adb} />
        <CapabilitiesPanel adb={adb} />
        <DiagnosticsPanel adb={adb} />
        <VirtualDisplayPanel adb={adb} />
        <DemoModePanel adb={adb} />
        <DeviceBackupPanel adb={adb} />
      </div>
    </div>
  );
}
