import { useState } from 'react';
import { Cable, KeyRound, RefreshCw, Usb } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SpinBar } from '@/features/home/SpinBar';
import { deviceCredentialManager } from '@/lib/connection/credentials';
import type { AdbDaemonWebUsbDevice } from '@/lib/connection/usb';
import { usbSupported } from '@/lib/connection/usb';
import { useT } from '@/lib/i18n';
import type { ConnectionTask } from '@/features/home/useConnectionTask';

export interface UsbPanelProps {
  devices: readonly AdbDaemonWebUsbDevice[];
  task: ConnectionTask;
  autoConnect: boolean;
  onAutoConnectChange: (value: boolean) => void;
  onRefresh: () => Promise<void>;
  onPick: () => void;
  onConnect: (device: AdbDaemonWebUsbDevice) => void;
  onSwitchToBridge: () => void;
}

export function UsbPanel({
  devices,
  task,
  autoConnect,
  onAutoConnectChange,
  onRefresh,
  onPick,
  onConnect,
  onSwitchToBridge,
}: UsbPanelProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [forgetting, setForgetting] = useState(false);

  const forget = async () => {
    setForgetting(true);
    try {
      const count = await deviceCredentialManager.clearAllCredentials();
      toast.success(t('home.usb.cleared', { count }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('home.usb.clearFailed'));
    } finally {
      setForgetting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold tracking-[-0.01em] text-ink">{t('home.usb.title')}</h2>
            <Badge tone={usbSupported ? 'success' : 'danger'}>
              {usbSupported ? t('home.usb.available') : t('home.usb.unsupported')}
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            {t('home.usb.lead')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void onRefresh()}
          disabled={task.busy}
          aria-label={t('home.usb.refresh')}
        >
          <RefreshCw />
        </Button>
      </div>

      <div className="grid gap-2">
        {devices.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center">
            <Usb className="mx-auto size-5 text-muted-2" />
            <p className="mt-2 text-[12px] font-semibold text-ink-soft">{t('home.usb.emptyTitle')}</p>
            <p className="mt-1 text-[11px] text-muted">{t('home.usb.emptyHint')}</p>
          </div>
        ) : (
          devices.map(device => (
            <div
              key={`${device.raw.vendorId}:${device.raw.productId}:${device.serial}`}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-accent-soft text-accent">
                  <Usb className="size-4" />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[12.5px] font-semibold text-ink">{device.name || t('home.device.android')}</p>
                  <p className="truncate font-mono text-[10.5px] text-muted">{device.serial}</p>
                </div>
              </div>
              <Button size="md" variant="outline" disabled={task.busy} onClick={() => onConnect(device)}>
                {t('common.connect')}
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="lg" disabled={task.busy || !usbSupported} onClick={onPick}>
          <Usb />
          {t('home.usb.pick')}
        </Button>
        {devices[0] ? (
          <Button variant="outline" size="lg" disabled={task.busy} onClick={() => onConnect(devices[0] as AdbDaemonWebUsbDevice)}>
            {t('home.usb.connectLast')}
          </Button>
        ) : null}
      </div>

      <SpinBar task={task} />

      {task.error === t('home.usb.busy') ? (
        <Button variant="outline" size="md" className="justify-self-start" onClick={onSwitchToBridge}>
          <Cable />
          {t('home.usb.switchBridge')}
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
        <label className="flex items-center gap-2 text-[11.5px] text-muted">
          <Switch
            checked={autoConnect}
            onCheckedChange={onAutoConnectChange}
            aria-label={t('home.usb.autoConnectAria')}
          />
          {t('home.usb.autoConnect')}
        </label>
        <Button
          variant="danger-ghost"
          size="sm"
          disabled={forgetting}
          onClick={() => setConfirming(true)}
        >
          <KeyRound />
          {t('home.usb.clear')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('home.usb.clearTitle')}
        description={t('home.usb.clearDescription')}
        confirmLabel={forgetting ? t('home.usb.clearing') : t('home.usb.clearConfirm')}
        onConfirm={() => {
          setConfirming(false);
          void forget();
        }}
      />
    </div>
  );
}
