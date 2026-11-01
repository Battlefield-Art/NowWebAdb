import type { ServerDevice } from '@/lib/connection/server';
import { isWirelessSerial } from '@/lib/connection/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Cpu, RefreshCw, Unplug } from 'lucide-react';
import { useT, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

const STATE_LABEL = {
  device: { labelKey: 'home.serverDevice.state.available', tone: 'success' },
  unauthorized: { labelKey: 'home.serverDevice.state.unauthorized', tone: 'warning' },
  offline: { labelKey: 'home.serverDevice.state.offline', tone: 'neutral' },
} as const satisfies Record<
  ServerDevice['state'],
  { labelKey: MessageKey; tone: 'success' | 'warning' | 'neutral' }
>;

export interface ServerDeviceListProps {
  devices: readonly ServerDevice[];
  loaded: boolean;
  busy: boolean;
  pendingSerial: string;
  onOpen: (device: ServerDevice) => void;
  onReconnect: (device: ServerDevice) => void;
  onDisconnect: (device: ServerDevice) => void;
  onShowFeatures: (device: ServerDevice) => void;
}

function DeviceActions({
  device,
  busy,
  pendingSerial,
  onOpen,
  onReconnect,
  onDisconnect,
  onShowFeatures,
}: Omit<ServerDeviceListProps, 'devices' | 'loaded'> & { device: ServerDevice }) {
  const t = useT();
  const available = device.state === 'device';
  const pending = pendingSerial === device.serial;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('home.serverDevice.featuresAria', { serial: device.serial })}
        title={t('home.serverDevice.featuresTitle')}
        disabled={busy}
        onClick={() => onShowFeatures(device)}
      >
        <Cpu />
      </Button>
      {isWirelessSerial(device.serial) ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('home.serverDevice.disconnectAria', { serial: device.serial })}
          title={t('home.serverDevice.disconnectTitle')}
          disabled={busy}
          onClick={() => onDisconnect(device)}
        >
          <Unplug />
        </Button>
      ) : null}
      {!available ? (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t('home.serverDevice.reconnectAria', { serial: device.serial })}
          title={t('home.serverDevice.reconnectTitle')}
          disabled={busy}
          onClick={() => onReconnect(device)}
        >
          {pending ? <Spinner className="size-3.5" /> : <RefreshCw />}
        </Button>
      ) : null}
      <Button size="md" variant="outline" disabled={busy || !available} onClick={() => onOpen(device)}>
        {t('common.open')}
      </Button>
    </div>
  );
}

export function ServerDeviceList(props: ServerDeviceListProps) {
  const t = useT();
  const { devices, loaded, busy, pendingSerial, onOpen, onReconnect, onDisconnect, onShowFeatures } = props;

  if (devices.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-center">
        <p className="text-[12px] font-semibold text-ink-soft">
          {loaded ? t('home.serverDevice.empty') : t('home.serverDevice.notLoaded')}
        </p>
        <p className="mt-1 text-[11px] text-muted">
          {loaded ? t('home.serverDevice.emptyHint') : t('home.serverDevice.loadHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {devices.map(device => {
        const status = STATE_LABEL[device.state];
        const available = device.state === 'device';
        return (
          <div
            key={String(device.transportId)}
            className={cn(
              'flex items-center justify-between gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5',
              !available && 'opacity-75',
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[12.5px] font-semibold text-ink">
                  {device.model || device.product || t('home.device.android')}
                </p>
                <Badge tone={status.tone}>{t(status.labelKey)}</Badge>
              </div>
              <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted">{device.serial}</p>
            </div>
            <DeviceActions
              device={device}
              busy={busy}
              pendingSerial={pendingSerial}
              onOpen={onOpen}
              onReconnect={onReconnect}
              onDisconnect={onDisconnect}
              onShowFeatures={onShowFeatures}
            />
          </div>
        );
      })}
    </div>
  );
}
