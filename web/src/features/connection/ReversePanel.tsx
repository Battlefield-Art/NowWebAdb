import { useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { ArrowLeftRight, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { normalizeDeviceAddress, normalizeHostAddress } from '@/features/connection/connectionUtils';
import { PanelShell } from '@/features/connection/PanelShell';
import { addExternalReverse, removeAllReverseTunnels, removeReverseTunnel, type AdbForwardListener } from '@/lib/adb/reverse';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface ReversePanelProps {
  adb: Adb;
  tunnels: AdbForwardListener[];
  error: string;
  canAddExternal: boolean;
  onChanged: () => void;
}

function TunnelRow({
  tunnel,
  onRemove,
  onCopy,
}: {
  tunnel: AdbForwardListener;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-2 rounded-[9px] border border-line-soft bg-surface-2 px-3 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-mono text-[11.5px] font-semibold text-ink">
          <span className="truncate">{tunnel.remoteName}</span>
          <ArrowLeftRight className="size-3 shrink-0 text-muted-2" />
          <span className="truncate text-muted">{tunnel.localName}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-2">{t('connection.reverse.tunnelDirection')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="icon-sm" aria-label={t('connection.reverse.copyAddress')} onClick={onCopy}>
          <Copy />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('connection.reverse.removeTunnel')}
          className="text-muted hover:bg-danger-soft hover:text-danger"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

export function ReversePanel({ adb, tunnels, error, canAddExternal, onChanged }: ReversePanelProps) {
  const t = useT();
  const [devicePort, setDevicePort] = useState('8080');
  const [hostPort, setHostPort] = useState('8080');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      const device = normalizeDeviceAddress(devicePort);
      const host = normalizeHostAddress(hostPort);
      const created = await addExternalReverse(adb, device, host);
      toast.success(t('connection.reverse.created', { tunnel: created, host }));
      onChanged();
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tunnel: AdbForwardListener) => {
    setBusy(true);
    try {
      await removeReverseTunnel(adb, tunnel.remoteName);
      toast.success(t('connection.reverse.removed', { name: tunnel.remoteName }));
      onChanged();
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    setConfirmClear(false);
    setBusy(true);
    try {
      await removeAllReverseTunnels(adb);
      toast.success(t('connection.reverse.cleared'));
      onChanged();
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard
      .writeText(value)
      .then(() => toast.success(t('connection.reverse.copied')))
      .catch(() => toast.error(t('connection.reverse.clipboardDenied')));
  };

  return (
    <PanelShell
      kicker="Reverse tunnel"
      title={t('connection.reverse.title')}
      action={
        <div className="flex items-center gap-2">
          <Badge tone={tunnels.length > 0 ? 'accent' : 'neutral'}>
            {t('connection.reverse.count', { count: tunnels.length })}
          </Badge>
          {tunnels.length > 0 ? (
            <Button variant="danger-ghost" size="sm" disabled={busy} onClick={() => setConfirmClear(true)}>
              {t('common.clear')}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-2">
        {tunnels.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-center">
            <p className="text-[12px] font-semibold text-ink-soft">{t('connection.reverse.emptyTitle')}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {t('connection.reverse.emptyHint')}
            </p>
          </div>
        ) : (
          tunnels.map(tunnel => (
            <TunnelRow
              key={`${tunnel.deviceSerial}-${tunnel.remoteName}`}
              tunnel={tunnel}
              onRemove={() => void remove(tunnel)}
              onCopy={() => copy(tunnel.remoteName)}
            />
          ))
        )}
      </div>

      {error ? <p className="text-[11px] leading-relaxed text-danger">{error}</p> : null}

      {canAddExternal ? (
        <div className="mt-auto grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label={t('connection.reverse.devicePort')} htmlFor="reverse-device">
            <Input
              id="reverse-device"
              value={devicePort}
              inputMode="numeric"
              disabled={busy}
              onChange={event => setDevicePort(event.target.value)}
            />
          </Field>
          <Field label={t('connection.reverse.hostPort')} htmlFor="reverse-host">
            <Input
              id="reverse-host"
              value={hostPort}
              inputMode="numeric"
              disabled={busy}
              onChange={event => setHostPort(event.target.value)}
            />
          </Field>
          <Button variant="outline" size="lg" disabled={busy} onClick={() => void add()}>
            {t('connection.reverse.create')}
          </Button>
        </div>
      ) : (
        <p className="mt-auto border-t border-line-soft pt-3 text-[10.5px] leading-relaxed text-muted-2">
          {t('connection.reverse.externalHint')}
        </p>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('connection.reverse.clearTitle', { count: tunnels.length })}
        description={t('connection.reverse.clearDescription')}
        confirmLabel={t('common.clear')}
        onConfirm={() => void clearAll()}
      />
    </PanelShell>
  );
}
