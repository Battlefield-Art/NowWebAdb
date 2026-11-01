import { RefreshCw, Usb, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { tcpListenSummary } from '@/features/connection/connectionUtils';
import { PanelShell } from '@/features/connection/PanelShell';
import type { ConnectionStatus } from '@/features/connection/useConnectionStatus';
import { useT } from '@/lib/i18n';
import { useDeviceStore } from '@/stores/device';

export interface LinkPanelProps {
  status: ConnectionStatus;
  loading: boolean;
  onRefresh: () => void;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <span className="shrink-0 text-[11.5px] text-muted">{label}</span>
      <span
        className={
          mono
            ? 'min-w-0 break-all text-right font-mono text-[11px] font-medium text-ink-soft'
            : 'min-w-0 break-all text-right text-[11.5px] font-semibold text-ink-soft'
        }
      >
        {value}
      </span>
    </div>
  );
}

export function LinkPanel({ status, loading, onRefresh }: LinkPanelProps) {
  const t = useT();
  const kind = useDeviceStore(state => state.kind);
  const serial = useDeviceStore(state => state.serial);
  const snapshot = useDeviceStore(state => state.snapshot);
  const ip = status.wlanIp || snapshot?.network.ip || '';

  return (
    <PanelShell
      kicker="Current link"
      title={t('connection.link.title')}
      action={
        <div className="flex items-center gap-2">
          <Badge tone="success">{t('connection.link.connected')}</Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('connection.link.refresh')}
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
          </Button>
        </div>
      }
    >
      <div className="divide-y divide-line-soft overflow-hidden rounded-[10px] border border-line-soft">
        <Row
          label={t('connection.link.method')}
          value={kind === 'usb' ? t('connection.page.kindUsb') : t('connection.page.kindServer')}
        />
        <Row label={t('connection.link.serial')} value={serial || '—'} mono />
        <Row label={t('connection.link.model')} value={snapshot?.model || '—'} />
        <Row label="Wi-Fi IPv4" value={ip || t('connection.link.noWlanIp')} mono />
        <Row
          label={t('connection.link.legacyTcp')}
          value={status.tcpError ? t('common.readFailed') : tcpListenSummary(status.tcp)}
          mono
        />
      </div>

      <div className="mt-auto flex items-center gap-2 rounded-[9px] bg-surface-2 px-3 py-2 text-[10.5px] leading-relaxed text-muted">
        {kind === 'usb' ? <Usb className="size-3.5 shrink-0 text-muted-2" /> : <Wifi className="size-3.5 shrink-0 text-muted-2" />}
        <span className="flex-1">
          {kind === 'usb' ? t('connection.link.usbHint') : t('connection.link.serverHint')}
        </span>
      </div>
    </PanelShell>
  );
}
