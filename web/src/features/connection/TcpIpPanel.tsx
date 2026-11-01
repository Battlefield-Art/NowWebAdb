import { useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { AlertTriangle, Radio, RefreshCw, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { DEFAULT_TCP_PORT, parseTcpPort, tcpListenSummary } from '@/features/connection/connectionUtils';
import { PanelShell } from '@/features/connection/PanelShell';
import type { ConnectionStatus } from '@/features/connection/useConnectionStatus';
import { useWirelessSwitch } from '@/features/connection/useWirelessSwitch';
import { disableTcpIp, setTcpIpPort } from '@/lib/adb/tcpip';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { useDeviceStore } from '@/stores/device';

export interface TcpIpPanelProps {
  adb: Adb;
  status: ConnectionStatus;
  onChanged: () => void;
}

export function TcpIpPanel({ adb, status, onChanged }: TcpIpPanelProps) {
  const t = useT();
  const kind = useDeviceStore(state => state.kind);
  const server = useDeviceStore(state => state.server);
  const wirelessSwitch = useWirelessSwitch(adb, server, status.wlanIp);
  const [port, setPort] = useState(DEFAULT_TCP_PORT);
  const [pending, setPending] = useState<'enable' | 'disable' | null>(null);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState('');

  const locked = busy || wirelessSwitch.busy;
  const wirelessHint = wirelessSwitch.wireless
    ? t('connection.tcpIp.hintWireless', { serial: adb.serial })
    : kind === 'server'
      ? t('connection.tcpIp.hintServer')
      : t('connection.tcpIp.hintUsb');

  let portValid = true;
  try {
    parseTcpPort(port);
  } catch {
    portValid = false;
  }

  const listening = status.tcp?.serviceListenAddresses.length ?? 0;
  const canEnable = kind === 'usb' && portValid && !locked;

  const run = async (action: 'enable' | 'disable') => {
    setPending(null);
    setBusy(true);
    setResponse('');
    try {
      const message =
        action === 'enable' ? await setTcpIpPort(adb, parseTcpPort(port)) : await disableTcpIp(adb);
      setResponse(message.trim());
      toast.success(
        action === 'enable'
          ? t('connection.tcpIp.enableRequested', { port })
          : t('connection.tcpIp.disableRequested'),
      );
      onChanged();
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell
      kicker="Legacy TCP/IP"
      title={t('connection.tcpIp.title')}
      action={
        <Badge tone={listening > 0 ? 'success' : 'neutral'}>
          {listening > 0 ? t('connection.tcpIp.on') : t('connection.tcpIp.off')}
        </Badge>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line-soft bg-surface-2 px-3 py-2">
        <span className="flex items-center gap-2 text-[11px] text-muted">
          <Radio className="size-3.5 text-muted-2" />
          {t('connection.tcpIp.listenAddress')}
        </span>
        <span className="font-mono text-[11px] font-medium text-ink-soft">
          {tcpListenSummary(status.tcp)}
        </span>
      </div>

      {status.tcpError ? (
        <p className="text-[11px] leading-relaxed text-danger">{status.tcpError}</p>
      ) : null}

      <div className="flex items-start gap-2 rounded-[9px] border border-warning/25 bg-warning-soft px-3 py-2 text-[11px] leading-relaxed text-warning">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>{t('connection.tcpIp.warning')}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] border border-line-soft bg-surface-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-ink-soft">{t('connection.tcpIp.switchTitle')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{wirelessHint}</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          disabled={!wirelessSwitch.canSwitch || !portValid}
          onClick={() => wirelessSwitch.switchToWireless(parseTcpPort(port))}
        >
          {wirelessSwitch.busy ? <Spinner className="size-3.5" /> : <Wifi />}
          {t('connection.tcpIp.switch')}
        </Button>
      </div>

      <div className="mt-auto grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field
          label={t('connection.tcpIp.port')}
          htmlFor="tcp-port"
          hint={portValid ? t('connection.tcpIp.portHint') : t('connection.tcpIp.portInvalid')}
        >
          <Input
            id="tcp-port"
            value={port}
            inputMode="numeric"
            maxLength={5}
            disabled={locked}
            onChange={event => setPort(event.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="lg"
            disabled={!canEnable}
            title={kind === 'usb' ? undefined : t('connection.tcpIp.usbOnly')}
            onClick={() => setPending('enable')}
          >
            {t('connection.tcpIp.enable')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-danger hover:border-danger hover:bg-danger-soft hover:text-danger"
            disabled={locked}
            onClick={() => setPending('disable')}
          >
            {t('connection.tcpIp.disable')}
          </Button>
        </div>
      </div>

      {response ? (
        <div className="flex items-start gap-2 border-t border-line-soft pt-3 font-mono text-[10.5px] leading-relaxed text-muted">
          <RefreshCw className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 break-all">{response}</span>
        </div>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => {
          if (!open) setPending(null);
        }}
        title={
          pending === 'enable'
            ? t('connection.tcpIp.enableTitle', { port })
            : t('connection.tcpIp.disableTitle')
        }
        description={
          pending === 'enable'
            ? t('connection.tcpIp.enableDescription')
            : t('connection.tcpIp.disableDescription')
        }
        confirmLabel={pending === 'enable' ? t('connection.tcpIp.enable') : t('connection.tcpIp.disable')}
        onConfirm={() => {
          if (pending) void run(pending);
        }}
      />
    </PanelShell>
  );
}
